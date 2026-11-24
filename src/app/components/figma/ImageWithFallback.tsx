import React, { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { isTrackingPixelDimensions } from "../../motion/editorialMotion";

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  hideOnError?: boolean;
  onInvalidImage?: () => void;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const { src, alt, style, className, hideOnError = false, onInvalidImage, ...rest } = props;
  const [didError, setDidError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDidError(false);
    setLoaded(false);
  }, [src]);

  if (!src || didError) {
    if (hideOnError) return null;
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[var(--background-muted)] via-[var(--background-subtle)] to-[var(--card)] flex flex-col items-center justify-center p-4 text-center select-none ${className ?? ""}`}
        style={style}
        role="img"
        aria-label={alt || "تصویر مقاله"}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12] bg-[radial-gradient(#1fa378_1px,transparent_1px)] [background-size:16px_16px]"
        />
        <Newspaper className="w-6 h-6 text-[var(--foreground-subtle)] opacity-60 mb-1.5 relative z-10" />
        {alt && (
          <span className="text-[11px] text-[var(--foreground-subtle)] line-clamp-2 max-w-[22ch] leading-relaxed relative z-10">
            {alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ""}
      referrerPolicy="no-referrer"
      style={style}
      {...rest}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (isTrackingPixelDimensions(img.naturalWidth, img.naturalHeight)) {
          setDidError(true);
          onInvalidImage?.();
          return;
        }
        setLoaded(true);
        props.onLoad?.(e);
      }}
      onError={(e) => {
        setDidError(true);
        onInvalidImage?.();
        props.onError?.(e);
      }}
      className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    />
  );
}
