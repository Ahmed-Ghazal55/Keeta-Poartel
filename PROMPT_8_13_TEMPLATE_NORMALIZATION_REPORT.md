# Prompt 8.13 Template Normalization Report

Date: 2026-08-02

## Canonical metadata

Every centralized supported definition exposes:

- `templateId`, `importType`, `targetEntity`, `sourceModule`, and `displayName`
- required and optional columns
- normalizer key and validation rules
- default scope fields
- bounded preview columns
- post-save focus target

Existing detailed spreadsheet header aliases and workbook normalizers remain in `importTemplateRegistry.js` and `importNormalizer.js`; the new model supplies the stable UI-facing contract around them.

## Identity preservation

- Dashboard user, owner, actual rider, HR rider, and external rider remain distinct fields.
- Registered and actual vehicle fields remain separate.
- Preview normalization preserves batch, file, template, import type, source row, register, city, platform, month, and validation status.

## Safety

Template selection and normalization are read-only. Raw workbooks are not promoted to the primary UI; the browser shows a bounded canonical preview.
