import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ModalOverlayProps = React.HTMLAttributes<HTMLDivElement>;

export const ModalOverlay: React.FC<ModalOverlayProps> = ({
  children,
  className = '',
  ...rest
}) => {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return createPortal(
    <div className={`modal-overlay ${className}`.trim()} {...rest}>
      {children}
    </div>,
    document.body,
  );
};
