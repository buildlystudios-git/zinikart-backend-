---
name: payload-admin-ui
description: Use when customizing the Payload CMS 3.x Admin Panel UI/UX, creating custom views, field components, dashboard widgets, branding, or improving business user experience.
---

# Payload 3 Admin UI/UX Customization

This skill provides guidelines and patterns for building and customizing the Payload CMS Admin Panel to make it highly aesthetic, business-user friendly, and fully functional for operators.

## Core Architecture (Payload 3.x & Next.js App Router)

Payload 3's Admin Panel is built entirely on the **Next.js App Router**. 
- **React Server Components (RSC):** By default, all custom components you inject into Payload are Server Components. This is a superpower! You can fetch database data directly inside your custom dashboard or view without writing API endpoints.
- **Client Components:** If your component needs interactivity (e.g., `useState`, `onClick`, browser APIs), you MUST add `"use client"` at the top of the file.
- **Import Aliases:** Use the standard `@/` alias mapped to the `src` directory when registering components in your config.

## 1. Improving Business User Friendliness (No Code)

Before writing custom React, maximize Payload's built-in schema configurations. A great admin UI starts with a clean data schema:

- **Field Grouping:** Break up massive forms into logical sections.
  - Use `tabs` for entirely distinct concepts (e.g., "Basic Info", "SEO", "Inventory").
  - Use `collapsible` fields for optional or advanced settings.
- **Context & Guidance:** Always provide `admin.description` for complex fields. Use it as inline documentation for the business operator.
- **Hide Technicals:** System-generated fields (like IDs, API tokens) that users shouldn't touch should have `admin.hidden: true` or `admin.readOnly: true`.
- **Layout Management:** Move metadata, status flags, and relationships to the sidebar using `admin.position: 'sidebar'`. Keep the main column focused on core content.
- **List Views:** Ensure every collection has a clear `admin.useAsTitle` and a curated list of `admin.defaultColumns` so tables are instantly readable.

## 2. Custom Field Components

When a standard text input or select isn't enough, replace it with a custom React component (e.g., Color Pickers, Maps, Drag-and-Drop arrays).

```typescript
// In Collection Config
{
  name: 'brandColor',
  type: 'text',
  admin: {
    components: {
      Field: '@/components/admin/ColorPickerField#ColorPicker',
    }
  }
}
```

**Client Component Example (`ColorPickerField.tsx`):**
```tsx
'use client'
import { useField } from '@payloadcms/ui'
import React from 'react'

export const ColorPicker: React.FC<{ path: string }> = ({ path }) => {
  const { value, setValue } = useField<string>({ path })
  
  return (
    <div className="custom-color-picker">
      <label>Brand Color</label>
      <input type="color" value={value || '#000000'} onChange={(e) => setValue(e.target.value)} />
    </div>
  )
}
```

## 3. Custom Views & Dashboards

You can completely replace or extend Payload's views to create bespoke tools for the business team.

**Global Dashboard Replacement:**
```typescript
// payload.config.ts
admin: {
  components: {
    views: {
      Dashboard: {
        Component: '@/components/admin/CustomDashboard#CustomDashboard',
      }
    }
  }
}
```

**Collection View Replacements:**
You can inject views before, after, or completely replace the standard `List` and `Edit` views.
```typescript
// CollectionConfig
admin: {
  components: {
    views: {
      list: {
        Component: '@/components/admin/CustomListView#CustomListView',
      },
      edit: {
        // Add a new tab to the Edit view!
        myCustomTab: {
          path: '/custom-tab',
          Component: '@/components/admin/CustomTab#CustomTab',
          Tab: { label: 'Custom Tool' }
        }
      }
    }
  }
}
```

## 4. Using Native Payload UI Components

To ensure your custom components feel completely seamless and native to the CMS, always leverage Payload's internal UI library `@payloadcms/ui`.

**Available Utilities & Hooks:**
- `useDocumentInfo()`: Get the current document ID, global state, and save functions.
- `useAuth()`: Get the current logged-in user.
- `toast`: Trigger native success/error toast notifications.

```tsx
'use client'
import { Button, toast, useDocumentInfo } from '@payloadcms/ui'

export const PublishAction = () => {
  const { id } = useDocumentInfo()
  
  const handlePublish = async () => {
    // Custom logic here
    toast.success('Successfully published to external service!')
  }
  
  return <Button onClick={handlePublish}>Publish Now</Button>
}
```

## 5. UI Injections (Headers, Actions, Graphics)

You can inject components into specific slots of the Admin UI without replacing the entire view.

- **`admin.components.actions`**: Add buttons to the global header (next to the user profile).
- **`admin.components.beforeDashboard` / `afterDashboard`**: Add widgets to the default dashboard without removing the collection list.
- **`admin.components.graphics.Logo`**: Replace the Payload logo with the brand's logo.
- **`admin.components.graphics.Icon`**: Replace the favicon/small icon.

## 6. Global Branding & SCSS

To match the business's branding, inject a global CSS/SCSS file.

1. Create `src/scss/custom.scss`.
2. Link it in `payload.config.ts` under `admin.css: path.resolve(__dirname, 'scss/custom.scss')`.
3. Override Payload's CSS Variables:

```scss
@layer base {
  :root {
    --theme-bg: #f8f9fa;
    --theme-elevation-50: #ffffff;
    --theme-success-400: #10b981;
    --theme-error-400: #ef4444;
    
    // Typography
    --font-body: 'Inter', sans-serif;
  }
  
  [data-theme='dark'] {
    --theme-bg: #111827;
    --theme-elevation-50: #1f2937;
  }
}
```

## 7. Next Steps for Business Operations

When designing for business users:
1. **Reduce Clicks:** If they perform an action 100 times a day, build a custom List View button for it.
2. **Bulk Actions:** Allow them to select multiple rows and trigger a custom bulk action component.
3. **Analytics:** Use Server Components to query aggregations and display beautiful charts in the Dashboard or `beforeListTable`.
