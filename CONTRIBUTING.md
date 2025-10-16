# 🤝 Contributing to CoreBase

> **Guidelines for contributing** to the AI-Powered Development Suite

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Git**
- **Docker** (for container features)
- **VS Code** (recommended, with extensions)

### Setup Development Environment

```bash
# 1. Fork the repository
# Click "Fork" on GitHub, then clone your fork

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Corebase.git
cd Corebase

# 3. Add upstream remote
git remote add upstream https://github.com/youlyank/Corebase.git

# 4. Install dependencies
npm install

# 5. Setup database
npm run db:generate
npm run db:push

# 6. Start development server
npm run dev
```

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json"
  ]
}
```

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow the code standards below
- Add tests for new features
- Update documentation
- Commit frequently with clear messages

### 3. Test Your Changes

```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Run tests
npm test

# Test the application
npm run dev
```

### 4. Submit Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
# Use the PR template below
```

## 📝 Code Standards

### TypeScript/JavaScript

```typescript
// ✅ Good
interface UserProps {
  name: string;
  email: string;
  role: UserRole;
}

export default function UserProfile({ name, email, role }: UserProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = useCallback(async () => {
    setIsLoading(true);
    try {
      await performAction();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="user-profile">
      <h2>{name}</h2>
      <p>{email}</p>
      <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
        {role}
      </Badge>
    </div>
  );
}

// ❌ Bad
export default function UserProfile(props) {
  const [loading, setLoading] = useState(false);
  
  const handleAction = async () => {
    setLoading(true);
    await performAction();
    setLoading(false);
  };
  
  return (
    <div>
      <h2>{props.name}</h2>
      <p>{props.email}</p>
    </div>
  );
}
```

### React Components

```typescript
// ✅ Good component structure
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export function MyComponent({ 
  title, 
  onAction, 
  className 
}: MyComponentProps) {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
    onAction?.();
  }, [onAction]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Count: {count}</p>
        <Button onClick={handleClick}>
          Increment
        </Button>
      </CardContent>
    </Card>
  );
}

export default MyComponent;
```

### API Routes

```typescript
// ✅ Good API route
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = RequestSchema.parse(body);

    // Process request
    const result = await processData({ name, email });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

### CSS/Tailwind

```typescript
// ✅ Good - use Tailwind classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200">
  <h3 className="text-lg font-semibold text-gray-900">Title</h3>
  <Button variant="outline" size="sm">
    Action
  </Button>
</div>

// ❌ Bad - inline styles
<div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: 'white' }}>
  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Title</h3>
</div>
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// ✅ Good test example
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button disabled>Loading...</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### API Tests

```typescript
// ✅ Good API test
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/users/route';

describe('/api/users', () => {
  it('creates a new user', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    });

    await POST(req);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('john@example.com');
  });
});
```

## 📚 Documentation

### Code Comments

```typescript
/**
 * Calculates the total price including tax
 * @param basePrice - The base price before tax
 * @param taxRate - The tax rate as a decimal (0.1 for 10%)
 * @returns The total price including tax
 * @example
 * ```typescript
 * const total = calculateTotal(100, 0.1); // Returns 110
 * ```
 */
export function calculateTotal(basePrice: number, taxRate: number): number {
  return basePrice * (1 + taxRate);
}
```

### README Updates

When adding new features:
- Update the main README.md
- Add API documentation to `docs/api-documentation.md`
- Update the quick start guide if needed
- Add examples to documentation

## 🔄 Pull Request Process

### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Linting passes

## Screenshots (if applicable)
Add screenshots to help explain changes.

## Additional Notes
Any additional context or considerations.
```

### PR Guidelines

1. **Small, focused PRs** - One feature or fix per PR
2. **Clear descriptions** - Explain what and why
3. **Test coverage** - Include tests for new code
4. **Documentation** - Update relevant docs
5. **No merge conflicts** - Keep branches updated

## 🌟 Community Guidelines

### Code of Conduct

- **Be respectful** - Treat everyone with respect
- **Be inclusive** - Welcome all contributors
- **Be constructive** - Provide helpful feedback
- **Be patient** - Help others learn and grow

### Getting Help

- **Discussions** - Use GitHub Discussions for questions
- **Issues** - Report bugs with reproduction steps
- **Discord/Slack** - Join our community (links in README)

### Recognition

- **Contributors** - All contributors are recognized
- **Release Notes** - Notable contributions are mentioned
- **Community** - Active contributors may get maintainer access

## 🏆 Recognition System

### Contributor Tiers

- **🌱 Contributor** - First merged PR
- **🚀 Regular** - 5+ merged PRs
- **⭐ Advanced** - 10+ merged PRs
- **👑 Maintainer** - 20+ merged PRs + community involvement

### Benefits

- **Recognition** - Featured in README and releases
- **Access** - Early access to new features
- **Influence** - Input on roadmap decisions
- **Swag** - CoreBase stickers and merchandise

## 📞 Contact

- **Maintainers**: @youlyank
- **Email**: maintainers@corebase.dev
- **Discord**: [Join our Discord](https://discord.gg/corebase)

---

**🤝 Thank you for contributing to CoreBase!**