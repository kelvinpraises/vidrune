import { useState } from "react";
import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";
import { toast } from "sonner";

interface ConvictionModalProps {
  videoId: string;
  videoTitle: string;
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Callback to notify parent when modal opens/closes
}

export function ConvictionModal({ videoId, open: controlledOpen, onOpenChange }: ConvictionModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };
  const [fact, setFact] = useState("");
  const [proofs, setProofs] = useState<string[]>([""]);
  const [stakeAmount, setStakeAmount] = useState("0.1");

  const addProofField = () => {
    setProofs([...proofs, ""]);
  };

  const updateProof = (index: number, value: string) => {
    const newProofs = [...proofs];
    newProofs[index] = value;
    setProofs(newProofs);
  };

  const removeProof = (index: number) => {
    if (proofs.length > 1) {
      setProofs(proofs.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fact.trim()) {
      toast.error("Please provide a fact");
      return;
    }

    const filledProofs = proofs.filter((p) => p.trim());
    if (filledProofs.length === 0) {
      toast.error("Please provide at least one proof");
      return;
    }

    if (parseFloat(stakeAmount) < 0.1) {
      toast.error("Minimum stake is 0.1 ROHR");
      return;
    }

    // TODO: Submit conviction to smart contract
    console.log("Conviction submitted:", {
      videoId,
      fact,
      proofs: filledProofs,
      stakeAmount: parseFloat(stakeAmount),
    });

    toast.success("Conviction submitted successfully!");

    // Reset form and close
    setFact("");
    setProofs([""]);
    setStakeAmount("0.1");
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Only show trigger button if uncontrolled (no open prop passed) */}
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <button className="px-4 py-3 text-sm rounded-full font-mono font-bold bg-red-500 hover:bg-red-600 text-white transition-colors">
            Convict
          </button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Conviction</DialogTitle>
          <DialogDescription>
            Report an issue with this video index
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fact field */}
          <div className="space-y-2">
            <Label htmlFor="fact">Fact</Label>
            <Textarea
              id="fact"
              placeholder="Tags are incomplete"
              rows={3}
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              required
            />
          </div>

          {/* Proofs - Multiple text areas */}
          <div className="space-y-3">
            <Label>Proofs</Label>
            {proofs.map((proof, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Textarea
                    placeholder={`Transcript mentions 'blockchain' 50x at timestamp 15:30 but tag is missing`}
                    rows={4}
                    value={proof}
                    onChange={(e) => updateProof(index, e.target.value)}
                  />
                  {proofs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProof(index)}
                      className="mt-2"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addProofField}
              className="w-full"
            >
              + Add More Proof
            </Button>
          </div>

          {/* Stake amount */}
          <div className="space-y-2">
            <Label htmlFor="stake">Stake Amount (ROHR)</Label>
            <Input
              id="stake"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="0.1"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum stake: 0.1 ROHR
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Submit Conviction
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
