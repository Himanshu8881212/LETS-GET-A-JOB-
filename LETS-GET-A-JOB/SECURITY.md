# Security Policy

## Overview

This document outlines the security measures implemented in the LETS GET A JOB application and provides guidelines for maintaining security.

## Security Features

### 1. Security Headers

The application implements comprehensive security headers via `next.config.js`:

- **Strict-Transport-Security (HSTS)**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME-type sniffing
- **X-XSS-Protection**: Enables browser XSS protection
- **Content-Security-Policy (CSP)**: Restricts resource loading
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

### 2. Input Validation

All user inputs are validated using Zod schemas:

- **Resume Data**: `lib/validation/schemas.ts` - `resumeDataSchema`
- **Cover Letter Data**: `lib/validation/schemas.ts` - `coverLetterDataSchema`
- **Job Tracker Data**: Validated before database insertion

### 3. Rate Limiting

Rate limiting is implemented to prevent abuse:

- **PDF Generation**: 5 requests per minute per user
- **API Requests**: 30 requests per minute per user
- **Implementation**: `lib/rate-limit.ts`

### 4. Database Security

- **SQLite with Better-SQLite3**: Prepared statements prevent SQL injection
- **No Raw Queries**: All database operations use parameterized queries
- **Data Isolation**: User data is properly scoped and isolated

### 5. File Upload Security

- **PDF Only**: Only PDF files are accepted for ATS evaluation
- **Size Limits**: File size restrictions prevent DoS attacks
- **Validation**: Files are validated before processing

### 6. Environment Variables

- **No Hardcoded Secrets**: All sensitive data in environment variables
- **`.env.local`**: Excluded from version control
- **`.env.example`**: Template provided for setup

### 7. Middleware Protection

Custom middleware (`middleware.ts`) provides:

- **Method Validation**: Only allowed HTTP methods
- **Content-Type Validation**: Ensures proper request formats
- **CORS Configuration**: Controlled cross-origin access
- **Path Protection**: Secures API routes

## Security Best Practices

### For Developers

1. **Never commit sensitive data**
   - API keys, tokens, passwords must be in `.env.local`
   - Use `.env.example` as a template

2. **Validate all inputs**
   - Use Zod schemas for validation
   - Sanitize user inputs before processing

3. **Use prepared statements**
   - Never concatenate SQL queries
   - Always use parameterized queries

4. **Keep dependencies updated**
   ```bash
   npm audit
   npm audit fix
   ```

5. **Review security headers**
   - Test with [Security Headers](https://securityheaders.com/)
   - Adjust CSP as needed for new features

### For Deployment

1. **Environment Variables**
   - Set all required environment variables
   - Use strong, unique values for production
   - Never expose `.env.local` or `.env`

2. **HTTPS Only**
   - Always use HTTPS in production
   - Configure HSTS headers properly

3. **Database Backups**
   - Regular backups of `data/app.db`
   - Secure backup storage
   - Test restore procedures

4. **Monitoring**
   - Monitor for unusual activity
   - Set up alerts for rate limit violations
   - Log security events

5. **Docker Security**
   - Use official base images
   - Keep images updated
   - Run containers as non-root user
   - Scan images for vulnerabilities

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email the maintainers directly
3. Provide detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Checklist

### Before Deployment

- [ ] All environment variables configured
- [ ] `.env.local` not committed to repository
- [ ] Security headers tested
- [ ] Rate limiting configured
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Dependencies updated (`npm audit`)
- [ ] CSP policy reviewed
- [ ] CORS policy configured correctly
- [ ] File upload limits set

### Regular Maintenance

- [ ] Weekly: Check for dependency updates
- [ ] Monthly: Review security logs
- [ ] Monthly: Test backup restoration
- [ ] Quarterly: Security audit
- [ ] Quarterly: Update dependencies

## Known Security Considerations

### 1. In-Memory Rate Limiting

Current rate limiting uses in-memory storage. For production at scale:

- Consider Redis-based rate limiting
- Implement distributed rate limiting for multiple instances

### 2. File Storage

PDF files are stored in `data/pdf-cache/`:

- Implement cleanup for old files
- Consider cloud storage for production
- Set up proper access controls

### 3. n8n Webhooks

External n8n webhooks are used for ATS evaluation:

- Ensure n8n instance is secured
- Use HTTPS for webhook URLs
- Implement webhook authentication if possible
- Validate webhook responses

### 4. CORS Policy

Current CORS policy allows all origins (`*`):

- Restrict to specific domains in production
- Update `middleware.ts` CORS configuration

## Security Updates

This document will be updated as new security features are implemented or vulnerabilities are discovered.

**Last Updated**: 2025-01-05
**Version**: 1.0.0

