import { useSiteContent } from "@/hooks/useSiteContent";
import { ReactNode, ElementType } from "react";

type EditableProps = {
  contentKey: string;
  fallback: string;
  as?: ElementType;
  className?: string;
  children?: never;
} & React.HTMLAttributes<HTMLElement>;

/** Inline editable text — reads override from site_content, falls back to default. */
export const Editable = ({
  contentKey,
  fallback,
  as: Tag = "span",
  className,
  ...rest
}: EditableProps) => {
  const { content } = useSiteContent();
  const value = content[contentKey] ?? fallback;
  return (
    <Tag className={className} data-editable-key={contentKey} {...rest}>
      {value}
    </Tag>
  );
};

/** Multi-line: preserves \n as <br />. */
export const EditableMultiline = ({
  contentKey,
  fallback,
  as: Tag = "p",
  className,
  ...rest
}: EditableProps) => {
  const { content } = useSiteContent();
  const value = content[contentKey] ?? fallback;
  const lines = value.split("\n");
  return (
    <Tag className={className} data-editable-key={contentKey} {...rest}>
      {lines.map((l, i) => (
        <span key={i}>
          {l}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </Tag>
  );
};

type ImgProps = {
  contentKey: string;
  fallback: string;
  alt?: string;
  altKey?: string;
  className?: string;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export const EditableImage = ({
  contentKey,
  fallback,
  alt = "",
  altKey,
  className,
  ...rest
}: ImgProps) => {
  const { content } = useSiteContent();
  const src = content[contentKey] || fallback;
  const altValue = altKey ? (content[altKey] ?? alt) : alt;
  return (
    <img
      src={src}
      alt={altValue}
      data-editable-key={contentKey}
      className={className}
      {...rest}
    />
  );
};

/** Render a JSON list with override; falls back to provided default array. */
export function useEditableList<T>(contentKey: string, fallback: T[]): T[] {
  const { content } = useSiteContent();
  const raw = content[contentKey];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {
    /* ignore */
  }
  return fallback;
}
