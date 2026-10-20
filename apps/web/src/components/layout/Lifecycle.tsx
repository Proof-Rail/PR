'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, CheckCircle, Circle, Clock, Loader2, XCircle } from 'lucide-react';

const steps = [
  {
    id: 'created',
    title: 'Created',
    description: 'Agreement initialized with parties, terms, token, amount, deadlines, and policies.',
    actor: 'Creator',
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  {
    id: 'funded',
    title: 'Funded',
    description: 'Payer transfers agreed token amount to contract escrow. State transitions to Funded.',
    actor: 'Payer',
    icon: CheckCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    description: 'Work begins. Parties submit evidence (deliverables, proofs, reports) with content hashes.',
    actor: 'Payer / Payee',
    icon: Loader2,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    id: 'awaiting_verification',
    title: 'Awaiting Verification',
    description: 'All required evidence submitted. Verifier evaluates and records approval/rejection decisions.',
    actor: 'Verifier',
    icon: Clock,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'settled',
    title: 'Settled',
    description: 'Verification complete. Funds released to payee. Agreement reaches terminal state.',
    actor: 'Payee / Verifier',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

const alternativePaths = [
  {
    from: 'in_progress',
    to: 'disputed',
    label: 'Dispute Raised',
    description: 'Either party raises dispute. Funds locked. Resolver determines outcome.',
    icon: XCircle,
    color: 'text-red-500',
  },
  {
    from: 'funded',
    to: 'refunded',
    label: 'Refunded',
    description: 'Payer requests refund before evidence deadline. Funds returned per policy.',
    icon: ArrowRight,
    color: 'text-orange-500',
  },
  {
    from: 'any',
    to: 'expired',
    label: 'Expired',
    description: 'Deadlines pass without action. Automatic refund or expiry per agreement terms.',
    icon: Clock,
    color: 'text-muted-foreground',
  },
];

export function Lifecycle() {
  return (
    <section id="lifecycle" className="py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Agreement Lifecycle
          </h2>
          <p className="text-lg text-muted-foreground">
            Explicit state machine with authorized transitions. Every step recorded on-chain.
          </p>
        </div>

        {/* Main Flow */}
        <div className="mb-16">
          <h3 className="mb-8 text-center text-lg font-semibold text-muted-foreground">Primary Flow</h3>
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute left-1/2 top-16 bottom-16 w-0.5 bg-border -translate-x-1/2" />
            
            <div className="space-y-8 lg:space-y-16">
              {steps.map((step, index) => (
                <div key={step.id} className="relative flex lg:flex-row items-start gap-6">
                  {/* Step indicator */}
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center lg:h-16 lg:w-16">
                    {index < steps.length - 1 && (
                      <div className="hidden lg:absolute left-1/2 top-16 h-full w-0.5 bg-border -translate-x-1/2" />
                    )}
                    <div className={`
                      relative flex h-10 w-10 items-center justify-center rounded-full border-2 lg:h-12 lg:w-12
                      ${step.color} ${step.bgColor} border-current
                    `}>
                      <step.icon className="h-5 w-5 lg:h-6 lg:w-6" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 hidden lg:block h-3 w-3 -translate-x-1/2 rounded-full bg-background border-2 border-current" />
                  </div>

                  {/* Step content */}
                  <div className={`
                    flex-1 min-w-0
                    ${index % 2 === 0 ? 'lg:text-right lg:pr-8' : 'lg:pl-8'}
                  `}>
                    <div className={`
                      p-4 rounded-xl border ${step.bgColor} border-current/50
                      ${index % 2 === 0 ? 'lg:ml-auto' : 'lg:mr-auto'}
                    `}>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{step.title}</h4>
                        <Badge variant="outline" className="text-xs">{step.actor}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alternative Paths */}
        <div>
          <h3 className="mb-8 text-center text-lg font-semibold text-muted-foreground">Alternative Paths</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {alternativePaths.map((path, index) => (
              <Card key={index} className="border-current/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`
                      flex h-10 w-10 items-center justify-center rounded-full
                      ${path.color} ${path.color.replace('text-', 'bg-')}/10
                    `}>
                      <path.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{path.label}</h4>
                      <p className="text-sm text-muted-foreground">{path.from} → {path.to}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{path.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}