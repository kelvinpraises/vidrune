"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/atoms/drawer";
import { Button } from "@/components/atoms/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/utils";

interface IntroStep {
  title: string;
  content: React.ReactNode;
}

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: IntroStep[];
  modalTitle: string;
}

function StepContent({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onClose,
  setCurrentStep,
}: {
  steps: IntroStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  setCurrentStep: (step: number) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-4 px-4">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              index === currentStep
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      {/* Step Title */}
      <h3 className="text-lg font-semibold mb-4 px-4">{steps[currentStep].title}</h3>

      {/* Scrollable Step Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-4">{steps[currentStep].content}</div>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3 mt-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={onNext} className="flex-1">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={onClose} className="flex-1">
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function IntroModal({ isOpen, onClose, steps, modalTitle }: IntroModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-2xl font-outfit">{modalTitle}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col overflow-hidden pb-2">
            <StepContent
              steps={steps}
              currentStep={currentStep}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onClose={handleClose}
              setCurrentStep={setCurrentStep}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="h-[85vh] flex flex-col">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-xl font-outfit">{modalTitle}</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <StepContent
            steps={steps}
            currentStep={currentStep}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onClose={handleClose}
            setCurrentStep={setCurrentStep}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
