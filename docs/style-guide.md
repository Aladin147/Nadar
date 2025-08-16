# Documentation Style Guide

## Principles

### Single Source of Truth

- Each concept has one authoritative document
- Cross-reference rather than duplicate content
- Mark legacy/deprecated content clearly
- Update all references when moving content

### Technical Accuracy

- Use exact field names, types, and values from code
- Include realistic examples with actual data
- Reference current pricing and model versions
- Test all code examples and API calls

### Professional Tone

- Clear, concise, technical language
- Avoid marketing language or hyperbole
- Focus on facts, specifications, and behavior
- Write for developers and technical users

## Formatting Standards

### Code Examples

Use JSON with proper syntax highlighting:

```json
{
  "speak": "A bag of rice on a kitchen counter",
  "timing": {
    "inspection_ms": 1200,
    "processing_ms": 800,
    "total_ms": 2000
  }
}
```

### Error Documentation

Document error codes with consistent format:

- **ERROR_CODE**: Description of when this occurs
- **NETWORK**: Transport layer failures
- **TIMEOUT**: Request exceeded time limits

### API Documentation

Follow this structure for endpoints:

1. Brief description
2. Request schema with required/optional fields
3. Response schema with examples
4. Error conditions and codes
5. Usage notes

### Cross-References

Use relative paths for internal links:

- `docs/api.md` (within docs/)
- `../shared/README.md` (from docs/ to shared/)
- `server/scripts/README.md` (from root)

## Content Organization

### File Naming

- Use kebab-case: `style-guide.md`, `api-reference.md`
- Be descriptive: `costs.md` not `pricing.md`
- Group related content in directories

### Section Structure

Use consistent heading hierarchy:

```markdown
# Document Title

## Major Section

### Subsection

#### Detail Level (sparingly)
```

### Lists and Tables

- Use bullet points for unordered concepts
- Use numbered lists for sequential steps
- Use tables for structured comparisons
- Add blank lines around lists for readability

## Version Control

### Commit Messages

- `docs: Add API reference for shared endpoints`
- `docs: Update telemetry schema with tokenUsage`
- `docs: Fix broken links in architecture guide`

### Change Documentation

When updating docs:

1. Update the primary document
2. Check for cross-references to update
3. Verify examples still work
4. Update any related legacy content

## Quality Checklist

Before committing documentation:

- [ ] All code examples are valid and tested
- [ ] Cross-references resolve correctly
- [ ] Pricing and model versions are current
- [ ] Markdown linting passes
- [ ] Content follows single-source-of-truth principle
- [ ] Technical accuracy verified against code

## Examples

### Good API Documentation

```markdown
## POST /api/assist-shared

Analyze an image and optionally answer a question.

Request:
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "language": "darija",
  "question": "what is this?"
}
```

Response:
```json
{
  "speak": "A bag of rice on a kitchen counter",
  "followupToken": "img_abc123",
  "timing": { "total_ms": 2000 }
}
```

Errors: 400 (INVALID_IMAGE), 500 (GENERATION_ERROR)
```

### Good Error Documentation

```markdown
## Error Codes

- **INVALID_IMAGE**: Missing imageBase64 or imageRef
- **IMAGE_NOT_FOUND**: Provided imageRef not found in cache
- **GENERATION_ERROR**: LLM failed to generate response
```

This style guide ensures consistent, accurate, and maintainable documentation across the project.
