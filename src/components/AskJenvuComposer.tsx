import type { ReactNode, RefObject } from "react";
import { ArrowUp, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared homepage/Terminal message box; each caller retains its own chat service. */
export function AskJenvuComposer({ value, onChange, placeholder, disabled, sendDisabled, inputRef, children }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  sendDisabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="ask-jenvu-composer flex items-center gap-2 rounded-full bg-background py-1 pl-4 pr-1.5 ring-1 ring-gc-line sm:gap-3 sm:py-2 sm:pl-5 sm:pr-2">
        <SearchCheck className="h-5 w-5 shrink-0 text-gc-ink-muted" />
        <textarea
          ref={inputRef}
          name="message"
          rows={1}
          value={value}
          maxLength={4000}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!sendDisabled) event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label="Ask a question"
          className="max-h-28 min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-gc-ink-muted"
        />
        <Button type="submit" aria-label="Send" disabled={sendDisabled} className="h-9 w-9 shrink-0 rounded-full bg-gc-blue p-0 text-gc-on-blue hover:bg-gc-blue-hover disabled:bg-gc-surface disabled:text-gc-ink-muted sm:h-10 sm:w-10">
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
      {children}
    </>
  );
}