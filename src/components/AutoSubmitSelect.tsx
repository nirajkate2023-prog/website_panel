"use client";

import { useRef } from "react";

/** Dropdown that submits its GET form as soon as the value changes. */
export default function AutoSubmitSelect({
  name,
  options,
  defaultValue,
  action,
  hidden = {},
  className,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  action: string;
  hidden?: Record<string, string>;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} method="get" className={className}>
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="field w-auto min-w-44"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn btn-green ml-2">
          Go
        </button>
      </noscript>
    </form>
  );
}
