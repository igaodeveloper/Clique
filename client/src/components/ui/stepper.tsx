import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type StepperContextValue = {
  activeStep: number;
  orientation: "horizontal" | "vertical";
};

const StepperContext = createContext<StepperContextValue>({
  activeStep: 0,
  orientation: "horizontal",
});

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number;
  orientation?: "horizontal" | "vertical";
  children: React.ReactNode;
}

export function Stepper({
  activeStep,
  orientation = "horizontal",
  children,
  className,
  ...props
}: StepperProps) {
  return (
    <StepperContext.Provider value={{ activeStep, orientation }}>
      <div
        className={cn(
          "flex",
          orientation === "vertical" ? "flex-col space-y-4" : "space-x-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  optional?: boolean;
  completed?: boolean;
  disabled?: boolean;
  index?: number;
}

export function Step({
  children,
  className,
  index: indexProp,
  ...props
}: StepProps) {
  const { activeStep, orientation } = useContext(StepperContext);
  const index = indexProp !== undefined ? indexProp : React.Children.count(children) - 1;
  const isActive = activeStep === index;
  const isCompleted = activeStep > index;

  return (
    <div
      className={cn(
        "relative flex",
        orientation === "vertical" ? "flex-col" : "flex-row items-center",
        className
      )}
      {...props}
    >
      <div className="flex items-center">
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 transition-colors",
            isCompleted
              ? "border-primary bg-primary text-primary-foreground"
              : isActive
              ? "border-primary text-primary"
              : "border-muted-foreground text-muted-foreground",
            orientation === "vertical" ? "h-8 w-8" : "h-8 w-8"
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="text-sm">{index + 1}</span>
          )}
        </div>
        {orientation === "horizontal" && (
          <div
            className={cn(
              "h-[2px] w-10",
              isCompleted
                ? "bg-primary"
                : "bg-muted-foreground/20"
            )}
          />
        )}
      </div>
      {orientation === "vertical" && (
        <div className="ml-4 mt-1 flex flex-col space-y-0.5">
          {children}
        </div>
      )}
      {orientation === "horizontal" && (
        <div className="ml-2 flex flex-col">{children}</div>
      )}
      {orientation === "vertical" && index !== undefined && (
        <div
          className={cn(
            "absolute left-4 top-10 h-full w-[2px]",
            isCompleted
              ? "bg-primary"
              : "bg-muted-foreground/20"
          )}
        />
      )}
    </div>
  );
}

export function StepTitle({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm font-medium", className)}
    >
      {children}
    </div>
  );
}

export function StepDescription({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-xs text-muted-foreground", className)}
    >
      {children}
    </div>
  );
}