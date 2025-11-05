import { useState, useCallback } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface ValidationErrors {
  [key: string]: string
}

export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validate = useCallback((field: string, value: any): string | null => {
    const rule = rules[field]
    if (!rule) return null

    // Required check
    if (rule.required && (!value || value.toString().trim() === '')) {
      return 'This field is required'
    }

    // Skip other validations if empty and not required
    if (!value || value.toString().trim() === '') {
      return null
    }

    // Min length check
    if (rule.minLength && value.toString().length < rule.minLength) {
      return `Minimum ${rule.minLength} characters required`
    }

    // Max length check
    if (rule.maxLength && value.toString().length > rule.maxLength) {
      return `Maximum ${rule.maxLength} characters allowed`
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value.toString())) {
      return 'Invalid format'
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value)
    }

    return null
  }, [rules])

  const validateField = useCallback((field: string, value: any) => {
    const error = validate(field, value)
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }))
    return error === null
  }, [validate])

  const validateAll = useCallback((data: any): boolean => {
    const newErrors: ValidationErrors = {}
    let isValid = true

    Object.keys(rules).forEach(field => {
      const error = validate(field, data[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [rules, validate])

  const clearError = useCallback((field: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    errors,
    validateField,
    validateAll,
    clearError,
    clearAllErrors
  }
}

