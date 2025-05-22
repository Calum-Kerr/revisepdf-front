'use client';

import React from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-gray-900 hover:bg-primary-500 hover:text-black active:bg-primary-400',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    outline: 'border border-gray-400 bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100',
    ghost: 'bg-transparent text-gray-800 hover:bg-gray-50 active:bg-gray-100',
    link: 'bg-transparent underline-offset-4 hover:underline text-primary-700 hover:text-primary-800',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-5 py-2.5 text-base',
    lg: 'h-13 px-7 py-3.5 text-lg',
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  // Add a safe click handler to catch and log any errors
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      // Call the original onClick handler if it exists
      if (props.onClick) {
        props.onClick(e);
      }
    } catch (error) {
      console.error('Error in button click handler:', error);
      // Prevent the default action if there was an error
      e.preventDefault();
      // Show an error toast
      toast.error('An error occurred. Please try again.');
    }
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyles,
        className
      )}
      disabled={disabled || isLoading}
      {...props}
      onClick={handleClick}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
