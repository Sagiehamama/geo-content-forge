# Development Process

- Feature-driven, iterative, and phased development (MVP → Phase 2)
- Modular agent/service design for scalability
- PRD-driven updates to memory bank and docs
- Regular review of workflow and agent outputs
- User feedback loop for continuous improvement
- Media Agent prompt is stored in the DB and editable via the settings page. Media Agent currently only does image search and user selection, not generation.
- Future: auto-publishing, multi-language, collaboration, metrics dashboard

## Troubleshooting Guide ✅ RECENT FIXES

### Template Processing Issues
**Symptom**: `ReferenceError: [variable] is not defined` in edge function logs
**Cause**: Missing variable in Function constructor parameters
**Solution**: Add missing variable to both Function constructor parameters and function call
```typescript
// Correct approach:
const templateFunction = new Function(
  'prompt', 'company', 'wordCount', 'includeImages', 'includeFrontmatter',
  'return `' + cleanTemplate + '`;'
);
const result = templateFunction(prompt, company, wordCount, includeImages, includeFrontmatter);
```

### React Key Warnings
**Symptom**: "Encountered two children with the same key" warnings in console
**Cause**: Duplicate IDs in XraySteps or component arrays
**Solution**: Use timestamp-based unique IDs
```typescript
// Correct approach:
id: `step_name_${Date.now()}`
```

### Image Marker Issues
**Symptom**: "NO SEMANTIC MARKERS" warnings, fallback image positioning
**Cause**: GPT-4o not following image marker instructions in prompt
**Solution**: Make image marker instructions more prominent and explicit in prompt template
```
CRITICAL: You MUST include semantic image markers in your content using this exact format: [IMAGE:description]
```

### Prompt Template Validation
**Symptom**: Content generation fails silently or produces unexpected results
**Cause**: Invalid template syntax or missing required placeholders
**Solution**: Use Settings page validation before saving templates
- Required: `${prompt}` placeholder must be present
- Conditional syntax: Check `${company ? 'text' : ''}` format
- Quote handling: Both `"${variable}"` and `${variable}` are supported

### Edge Function Deployment
**Symptom**: Changes not reflected after code updates
**Cause**: Edge functions need explicit deployment
**Solution**: Deploy specific functions after changes
```bash
npx supabase functions deploy generate-content
npx supabase functions deploy research-agent
npx supabase functions deploy media-agent
```

### Common Development Patterns
- Always test template changes in Settings page before deployment
- Use browser console to monitor for React warnings
- Check Supabase edge function logs for runtime errors
- Validate template syntax before saving to database
