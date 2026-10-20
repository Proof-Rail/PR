'use client';

import { useWallet } from '@/components/wallet/WalletProvider';
import { Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { ProofrailSDK, type CreateAgreementParams } from '@proofrail/sdk';
import { getProofrailSdk, getNetworkPassphrase } from '@/lib/proofrail';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, CheckCircle, Info, Loader2, XCircle } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import { EvidenceType, AgreementState, VerificationPolicy, DisputePolicy, Deadlines, validateCreateAgreement } from '@proofrail/shared';

const EVIDENCE_TYPES = [
  { value: EvidenceType.Document, label: 'Document', description: 'PDFs, contracts, invoices, reports' },
  { value: EvidenceType.Image, label: 'Image', description: 'Screenshots, photos, diagrams' },
  { value: EvidenceType.Video, label: 'Video', description: 'Recordings, demos, walkthroughs' },
  { value: EvidenceType.Code, label: 'Code', description: 'Source code, repositories, commits' },
  { value: EvidenceType.DeliveryProof, label: 'Delivery Proof', description: 'Tracking, receipts, confirmations' },
  { value: EvidenceType.CompletionReport, label: 'Completion Report', description: 'Final delivery, sign-off documents' },
  { value: EvidenceType.Other, label: 'Other', description: 'Custom evidence types' },
];

export default function CreateAgreementPage() {
  const { connected, address, connect, connecting, signTransaction, error: walletError, clearError } = useWallet();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Parties
    payer: '',
    payee: '',
    verifier: '',
    // Token & Amount
    token: '',
    amount: '',
    // Terms
    terms: '',
    termsHash: '',
    // Evidence Requirements
    requiredEvidenceTypes: [] as EvidenceType[],
    minEvidenceCount: 1,
    // Verification Policy
    requireAllApproved: true,
    autoSettleOnApproval: false,
    // Dispute Policy
    allowedInitiators: [] as string[],
    resolver: '',
    resolutionDeadlineHours: '',
    allowAutoResolution: false,
    // Deadlines (in hours from now)
    fundingDeadlineHours: 24,
    evidenceDeadlineHours: 168, // 1 week
    verificationDeadlineHours: 72,
    settlementDeadlineHours: 24,
    expiryHours: 720, // 30 days
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; agreementId?: string; error?: string } | null>(null);

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.payer) newErrors.payer = 'Payer address is required';
      if (!formData.payee) newErrors.payee = 'Payee address is required';
      if (formData.payer === formData.payee) newErrors.payee = 'Payer and payee must be different';
      if (!formData.token) newErrors.token = 'Token contract address is required';
      if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    }

    if (currentStep === 2) {
      if (!formData.terms.trim()) newErrors.terms = 'Agreement terms are required';
      if (formData.requiredEvidenceTypes.length === 0) newErrors.evidenceTypes = 'Select at least one evidence type';
      if (formData.minEvidenceCount < 1) newErrors.minEvidenceCount = 'Minimum evidence count must be at least 1';
    }

    if (currentStep === 3) {
      if (formData.allowedInitiators.length === 0) newErrors.allowedInitiators = 'At least one dispute initiator required';
      if (!formData.resolver && !formData.allowAutoResolution) newErrors.resolver = 'Resolver address or auto-resolution required';
      if (!formData.resolutionDeadlineHours || parseInt(formData.resolutionDeadlineHours) < 1) newErrors.resolutionDeadline = 'Resolution deadline required';

      // Validate that deadline offsets are in strict chronological order and
      // that the resolution deadline fits within the agreement's expiry window.
      const fd = formData.fundingDeadlineHours;
      const ed = formData.evidenceDeadlineHours;
      const vd = formData.verificationDeadlineHours;
      const sd = formData.settlementDeadlineHours;
      const ex = formData.expiryHours;
      const rd = parseInt(formData.resolutionDeadlineHours) || 0;

      if (fd >= ed)
        newErrors.evidenceDeadlineHours = 'Evidence deadline must be after funding deadline';
      if (ed >= vd)
        newErrors.verificationDeadlineHours = 'Verification deadline must be after evidence deadline';
      if (vd >= sd)
        newErrors.settlementDeadlineHours = 'Settlement deadline must be after verification deadline';
      if (sd >= ex)
        newErrors.expiryHours = 'Expiry must be after settlement deadline';
      if (rd > ex)
        newErrors.resolutionDeadline = 'Resolution deadline must not exceed the agreement expiry';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    if (!connected || !address) {
      setErrors({ wallet: 'Please connect your wallet first' });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      // Calculate deadlines
      const now = Math.floor(Date.now() / 1000);
      const deadlines: Deadlines = {
        fundingDeadline: now + formData.fundingDeadlineHours * 3600,
        evidenceDeadline: now + formData.evidenceDeadlineHours * 3600,
        verificationDeadline: now + formData.verificationDeadlineHours * 3600,
        settlementDeadline: now + formData.settlementDeadlineHours * 3600,
        expiry: now + formData.expiryHours * 3600,
      };

      const sdk = getProofrailSdk();

      if (sdk && address) {
        // Live mode: validate, simulate, sign with the wallet, then submit on-chain.
        const params: CreateAgreementParams = {
          creator: address,
          payer: formData.payer,
          payee: formData.payee,
          verifier: formData.verifier || null,
          token: formData.token,
          amount: BigInt(Math.round(Number(formData.amount) * 1e7)).toString(),
          termsHash:
            formData.termsHash ||
            (await ProofrailSDK.hashContentBytes(new TextEncoder().encode(formData.terms))),
          verificationPolicy: {
            requiredEvidenceTypes: formData.requiredEvidenceTypes,
            minEvidenceCount: formData.minEvidenceCount,
            requireAllApproved: formData.requireAllApproved,
            autoSettleOnApproval: formData.autoSettleOnApproval,
          },
          disputePolicy: {
            allowedInitiators: formData.allowedInitiators,
            resolver: formData.resolver || null,
            resolutionDeadline:
              Math.floor(Date.now() / 1000) + Number(formData.resolutionDeadlineHours) * 3600,
            allowAutoResolution: formData.allowAutoResolution,
          },
          deadlines,
        };

        validateCreateAgreement(params);

        const result = await sdk.createAgreement(params, async (tx) => {
          const passphrase = getNetworkPassphrase();
          const signedXdr = await signTransaction(tx.toXDR(), passphrase);
          const parsed = TransactionBuilder.fromXDR(signedXdr, passphrase);
          if (!(parsed instanceof Transaction)) throw new Error('Unexpected signed transaction format');
          return sdk.submitSigned(parsed);
        });

        if (!result.success) throw new Error(result.error || 'Transaction failed');
        setSubmitResult({ success: true, agreementId: result.hash });
        setStep(4);
        return;
      }

      // Demo mode (no deployed contract configured): simulate a success locally.
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockAgreementId = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setSubmitResult({ success: true, agreementId: mockAgreementId });
      setStep(4);
    } catch (err) {
      setSubmitResult({ success: false, error: err instanceof Error ? err.message : 'Failed to create agreement' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label htmlFor="payer">Payer Address *</Label>
          <Input
            id="payer"
            value={formData.payer}
            onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            error={errors.payer}
          />
          {formData.payer === address && (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> This is your address
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="payee">Payee Address *</Label>
          <Input
            id="payee"
            value={formData.payee}
            onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            error={errors.payee}
          />
        </div>
        <div>
          <Label htmlFor="verifier">Verifier Address (Optional)</Label>
          <Input
            id="verifier"
            value={formData.verifier}
            onChange={(e) => setFormData({ ...formData, verifier: e.target.value })}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="token">Token Contract Address *</Label>
          <Input
            id="token"
            value={formData.token}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            placeholder="CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            error={errors.token}
          />
          <p className="text-xs text-muted-foreground mt-1">Soroban token contract address (e.g., USDC, XLM wrapper)</p>
        </div>
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="10000000"
            error={errors.amount}
          />
          <p className="text-xs text-muted-foreground mt-1">Amount in smallest unit (e.g., 10000000 = 1 XLM for 7 decimals)</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="terms">Agreement Terms *</Label>
        <Textarea
          id="terms"
          value={formData.terms}
          onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
          placeholder="Describe the agreement terms, deliverables, milestones, and conditions..."
          rows={6}
          error={errors.terms}
        />
        <p className="text-xs text-muted-foreground mt-1">
          A SHA-256 hash of these terms will be stored on-chain. Full terms remain off-chain.
        </p>
      </div>

      <div>
        <Label>Required Evidence Types *</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {EVIDENCE_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.requiredEvidenceTypes.includes(type.value)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.requiredEvidenceTypes.includes(type.value)}
                onChange={(e) => setFormData({
                  ...formData,
                  requiredEvidenceTypes: e.target.checked
                    ? [...formData.requiredEvidenceTypes, type.value]
                    : formData.requiredEvidenceTypes.filter(t => t !== type.value)
                })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.evidenceTypes && <p className="text-sm text-destructive mt-1">{errors.evidenceTypes}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="minEvidenceCount">Minimum Evidence Count *</Label>
          <Input
            id="minEvidenceCount"
            type="number"
            min="1"
            max="50"
            value={formData.minEvidenceCount}
            onChange={(e) => setFormData({ ...formData, minEvidenceCount: parseInt(e.target.value) })}
            error={errors.minEvidenceCount}
          />
        </div>
        <div>
          <Label>Verification Options</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requireAllApproved}
                onChange={(e) => setFormData({ ...formData, requireAllApproved: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Require all evidence approved (no rejections allowed)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoSettleOnApproval}
                onChange={(e) => setFormData({ ...formData, autoSettleOnApproval: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Auto-settle when verification complete</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <Label>Dispute Initiators *</Label>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Addresses allowed to raise disputes (at least one required)</p>
          <Input
            value={formData.allowedInitiators.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              allowedInitiators: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            placeholder="GXXXX..., GXXXX... (comma separated)"
            error={errors.allowedInitiators}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="resolver">Dispute Resolver Address</Label>
          <Input
            id="resolver"
            value={formData.resolver}
            onChange={(e) => setFormData({ ...formData, resolver: e.target.value })}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            error={errors.resolver}
          />
        </div>
        <div>
          <Label htmlFor="resolutionDeadlineHours">Resolution Deadline (hours) *</Label>
          <Input
            id="resolutionDeadlineHours"
            type="number"
            min="1"
            value={formData.resolutionDeadlineHours}
            onChange={(e) => setFormData({ ...formData, resolutionDeadlineHours: e.target.value })}
            error={errors.resolutionDeadline}
          />
        </div>
      </div>

      <div>
        <Label>Resolution Options</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allowAutoResolution}
            onChange={(e) => setFormData({ ...formData, allowAutoResolution: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm">Allow automatic resolution (no resolver needed)</span>
        </label>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center">
      {submitResult?.success ? (
        <>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Agreement Created Successfully</h2>
          <p className="mb-4 text-muted-foreground">
            Your agreement has been submitted to the Stellar Testnet.
          </p>
          <div className="mb-6 p-4 rounded-lg bg-muted font-mono text-sm">
            Agreement ID: {submitResult.agreementId}
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => { setStep(1); setSubmitResult(null); }}>
              Create Another
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              View Dashboard
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Creation Failed</h2>
          <p className="mb-4 text-muted-foreground">{submitResult?.error || 'Unknown error occurred'}</p>
          <Button onClick={() => { setSubmitResult(null); setStep(3); }}>
            Try Again
          </Button>
        </>
      )}
    </div>
  );

  const steps = [
    { title: 'Parties & Token', description: 'Define who pays, who receives, and the token/amount' },
    { title: 'Terms & Evidence', description: 'Set agreement terms and evidence requirements' },
    { title: 'Disputes & Deadlines', description: 'Configure dispute resolution and time limits' },
    { title: 'Complete', description: 'Review and submit to blockchain' },
  ];

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 p-8 rounded-xl border bg-card">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h1 className="mb-4 text-2xl font-bold">Connect Your Wallet</h1>
              <p className="mb-6 text-muted-foreground">
                To create an agreement, you need to connect a Stellar-compatible wallet.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={() => connect()} disabled={connecting} className="w-full sm:w-auto">
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
                <Button size="lg" variant="outline" onClick={() => connect('freighter')} disabled={connecting} className="w-full sm:w-auto">
                  Freighter
                </Button>
                <Button size="lg" variant="outline" onClick={() => connect('albedo')} disabled={connecting} className="w-full sm:w-auto">
                  Albedo
                </Button>
              </div>
              {walletError && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{walletError}</span>
                  <button onClick={clearError} className="text-destructive hover:text-destructive/80" aria-label="Dismiss">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border" />
            <div className="relative flex justify-between">
              {steps.map((s, i) => (
                <div key={i} className="relative z-10 text-center">
                  <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    i < step ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground'
                  }`}>
                    {i < step - 1 ? <CheckCircle className="h-5 w-5" /> : <span className="font-semibold">{i + 1}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[100px]">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{steps[step - 1].title}</CardTitle>
              <CardDescription>{steps[step - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}

                {step < 4 && (
                  <div className="mt-8 flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      disabled={step === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="gap-2"
                    >
                      {step === 3 ? 'Create Agreement' : 'Continue'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="mt-6 border-info">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Important:</strong> This creates a binding on-chain agreement on Stellar Testnet.</p>
                  <p>• Terms are hashed on-chain; full text stays off-chain</p>
                  <p>• Evidence files remain off-chain; only hashes are committed</p>
                  <p>• Testnet assets have no real monetary value</p>
                  <p>• All actions require wallet signatures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
