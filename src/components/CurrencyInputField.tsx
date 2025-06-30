import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import CurrencyInput from 'react-currency-input-field';

interface CurrencyInputFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  prefix?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
}

export const CurrencyInputField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder = '0.00',
  prefix = '$',
  className = '',
  required = false,
  disabled = false,
  min,
  max,
  step,
  defaultValue,
}: CurrencyInputFieldProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
        <div className={`w-full ${className}`}>
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <div className="relative">
            <CurrencyInput
              id={name.toString()}
              name={name.toString()}
              placeholder={placeholder}
              defaultValue={defaultValue}
              value={value}
              decimalsLimit={2}
              onValueChange={(value) => {
                onChange(value ? parseFloat(value) : '');
              }}
              prefix={prefix}
              className={`w-full px-4 py-2 border ${
                error ? 'border-red-500' : 'border-gray-300'
              } rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-colors ${
                disabled ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
            />
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message}</p>
          )}
        </div>
      )}
    />
  );
};

export default CurrencyInputField;