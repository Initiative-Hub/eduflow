# 📝 Custom Form Component

Hey team! 👋 This folder contains our custom, config-driven form component. 

If you've ever built forms with `react-hook-form` + `zod` + `shadcn/ui`, you know it can get super repetitive. You end up writing the same boilerplate (`Controller`, `Label`, `Input`, `FormMessage`, etc.) for every single field. 

**This custom form component solves that.** 

## 🤔 Why is this useful?
- **Dramatically shortens code**: You don't have to write JSX for each input. Just declare a config array.
- **Separation of concerns**: Keeps your React component clean. All the form definitions (schema, default values, and field configs) live in a separate `.config.ts` file.
- **Automatic wiring**: It automatically hooks up validation, error messages, and accessibility labels!

---

## 🛠️ How to use it

We use the **Config + Template** pattern. Let's look at the `register` form as an example.

### Step 1: Create your config file (`register.config.ts`)
Define your Zod schema, types, default values, and the `fields` array. 

```typescript
import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

// 1. Define your Zod schema
export const registerSchema = z.object({
  fullname: z.string().min(1, 'Full Name cannot be empty'),
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// 2. Set default values
export const registerDefaultValues: RegisterFormData = {
  fullname: '',
  email: '',
  password: '',
};

// 3. Declare your fields! (This replaces writing endless JSX)
export const registerFields: FormFieldConfig[] = [
  {
    name: 'fullname',
    label: 'Full Name',
    type: 'text',           // Maps to standard text input
    placeholder: 'Enter your name',
    required: true,
    colSpan: 2,             // Form grid uses 2 columns by default
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    required: true,
    colSpan: 2,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
    colSpan: 2,
  }
];
```

### Step 2: Use the `<FormTemplate>` in your page (`page.tsx`)
Now, instead of manually writing out all those inputs, just pass your config into the `FormTemplate`.

```tsx
'use client';

import { FormTemplate } from '@/components/custom/form';
import {
  registerDefaultValues,
  registerFields,
  registerSchema,
} from './register.config';

export default function RegisterPage() {
  // Your submit handler
  const handleSubmit = async (data) => {
    console.log("Form Submitted!", data);
  };

  return (
    <FormTemplate
      schema={registerSchema}
      defaultValues={registerDefaultValues}
      fields={registerFields}
      onSubmit={handleSubmit}
      submitLabel="Create Account"
      isLoading={false}
    />
  );
}
```
**That's it! 🎉** The `FormTemplate` will automatically render all the inputs, handle state tracking, and show Zod error messages right under the fields.

---

## 🎨 Supported Field Types
The `type` property in `FormFieldConfig` supports a bunch of things out-of-the-box. Check out `form.types.ts` and the `fields/` folder for exactly how they work, but here are some common ones:

- `text`, `email`, `password`, `number`: Basic text inputs.
- `textarea`: Multiline text.
- `select`: Dropdown menu (requires passing `options`).
- `date-picker`: A calendar popover.
- `otp`: One-time password inputs.
- `dropzone`: File uploads.
- `switch`: A toggle switch.

If you need a new type of input, add it to the `FieldRenderer` in `form-fields.tsx` and create a corresponding component in the `fields/` directory!
