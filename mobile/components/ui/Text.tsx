import { cn } from '@/lib/cn';
import * as React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({ className, ...props }: TextProps & { className?: string }) {
  const textClass = React.useContext(TextClassContext);
  return (
    <RNText
      className={cn('text-[16px] text-text', textClass, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext };
