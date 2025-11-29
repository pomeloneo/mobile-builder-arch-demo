# Getting Started

<cite>
**Referenced Files in This Document**   
- [README.md](file://packages/h5-builder/README.md)
- [package.json](file://packages/h5-builder/package.json)
- [tsconfig.json](file://packages/h5-builder/tsconfig.json)
- [vite.config.ts](file://packages/h5-builder/vite.config.ts)
- [demo-progressive.tsx](file://packages/h5-builder/src/demo-progressive.tsx)
- [model-renderer.tsx](file://packages/h5-builder/src/components/model-renderer.tsx)
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts)
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts)
- [product-card.model.ts](file://packages/h5-builder/src/components/product-card/product-card.model.ts)
- [product-card.view.tsx](file://packages/h5-builder/src/components/product-card/product-card.view.tsx)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts)
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts)
- [schema.service.ts](file://packages/h5-builder/src/services/schema.service.ts)
- [mobx-vue-lite README.md](file://packages/mobx-vue-lite/README.md)
</cite>

## Table of Contents
1. [Installation](#installation)
2. [Development Environment Setup](#development-environment-setup)
3. [Quick Start Workflow](#quick-start-workflow)
4. [Running the Demo Application](#running-the-demo-application)
5. [Executing Tests](#executing-tests)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Installation

To get started with the H5 Builder Framework, install the required dependencies using pnpm as specified in the project configuration. This ensures consistent package resolution and optimal performance across development environments.

```bash
pnpm install
```

This command installs all dependencies defined in the `package.json` file, including core framework components, development tools, and testing utilities. The installation process sets up the complete development environment needed to build and run applications using the H5 Builder Framework.

**Section sources**
- [package.json](file://packages/h5-builder/package.json#L1-L39)
- [README.md](file://packages/h5-builder/README.md#L43-L47)

## Development Environment Setup

Proper TypeScript configuration is essential for the H5 Builder Framework to function correctly, particularly due to its reliance on decorators for dependency injection. The framework requires specific compiler options to be enabled in the `tsconfig.json` file.

The following TypeScript configuration settings are required:

- **`experimentalDecorators`**: Must be set to `true` to enable decorator syntax, which is used extensively for dependency injection throughout the framework
- **`emitDecoratorMetadata`**: Must be set to `true` to emit design-type metadata for decorated declarations in declaration files
- **`target`**: Set to `ES2020` or higher to ensure compatibility with modern JavaScript features
- **`jsx`**: Configured for React with `react-jsx` to support JSX syntax in TypeScript files
- **`baseUrl` and `paths`**: Properly configured to support module resolution and path aliases

The framework also uses Vite as its development server and build tool, with configuration defined in `vite.config.ts`. This includes React plugin integration, port configuration (3000), and automatic opening of the browser on startup.

**Section sources**
- [tsconfig.json](file://packages/h5-builder/tsconfig.json#L1-L30)
- [vite.config.ts](file://packages/h5-builder/vite.config.ts#L1-L23)

## Quick Start Workflow

The H5 Builder Framework follows a structured workflow for building dynamic, component-based applications. This workflow emphasizes separation of concerns, dependency injection, and reactive state management.

### 1. Define Component Schema

The foundation of any H5 Builder application is the component schema, which defines the structure and configuration of the UI components. The schema is a JSON-like object that specifies component types, IDs, properties, and hierarchical relationships.

```typescript
const schema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'main-tabs',
  props: { defaultIndex: 0 },
  children: [
    {
      type: 'ProductCard',
      id: 'product-1',
      props: { productId: 1 },
    },
  ],
};
```

The schema serves as a blueprint for the component tree, enabling dynamic construction of the application structure at runtime.

**Section sources**
- [README.md](file://packages/h5-builder/README.md#L51-L65)
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts#L31-L46)

### 2. Create Model with Dependency Injection

Models in the H5 Builder Framework contain the business logic and state management for components. They extend `BaseComponentModel` and utilize dependency injection to access services such as HTTP clients and tracking utilities.

```typescript
class ProductCardModel extends BaseComponentModel<{ productId: number }> {
  public loading = false;
  public data: ProductData | null = null;

  constructor(
    id: string,
    props: any,
    @Inject(HttpService) private http: HttpService
  ) {
    super(id, props);
  }

  protected async onInit(): Promise<void> {
    this.data = await this.http.get(`/api/product/${this.props.productId}`);
  }
}
```

The `@Inject` decorator automatically resolves and injects the requested service instance, promoting loose coupling and testability. The model handles data fetching, state management, and business logic while remaining completely separate from the UI.

**Section sources**
- [README.md](file://packages/h5-builder/README.md#L68-L86)
- [product-card.model.ts](file://packages/h5-builder/src/components/product-card/product-card.model.ts#L29-L133)
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts#L10-L243)

### 3. Create View with mobx-vue-lite Observer

Views in the H5 Builder Framework are pure UI components that render based on the state of their associated models. They use the `mobx-vue-lite` library to achieve reactive rendering, automatically updating when observable state changes.

```tsx
export const ProductCardView = observer((props: { model: ProductCardModel }) => {
  const { model } = props;
  
  if (model.loading) return <div>加载中...</div>;
  
  return (
    <div>
      <h3>{model.data.name}</h3>
      <div>{model.data.price}</div>
    </div>
  );
});
```

The `observer` higher-order component wraps the view and automatically tracks observable properties accessed during rendering. When these observables change, the component re-renders efficiently. This approach ensures that views remain simple and focused on presentation logic only.

**Section sources**
- [README.md](file://packages/h5-builder/README.md#L89-L103)
- [product-card.view.tsx](file://packages/h5-builder/src/components/product-card/product-card.view.tsx#L1-L81)
- [mobx-vue-lite README.md](file://packages/mobx-vue-lite/README.md#L1-L61)

### 4. Initialize Application with Injector and ComponentLoader

The application initialization process involves setting up the dependency injection container and component loader, which work together to construct the component tree from the schema.

```typescript
// Create Injector
const injector = new Injector();

// Register services
injector.registerInstance(HttpService, createHttpService(bridge));
injector.registerInstance(TrackerService, new TrackerService(bridge));

// Create ComponentLoader
const loader = new ComponentLoader(injector, tracker);
loader.register('ProductCard', ProductCardModel);

// Build Model Tree
const rootModel = loader.buildTree(schema);
await rootModel.init();

// Render
<ModelRenderer model={rootModel} />
```

The `Injector` manages service instances and their dependencies, while the `ComponentLoader` uses the schema and registered component types to recursively build the model tree. This separation of concerns allows for flexible configuration and easy testing.

**Section sources**
- [README.md](file://packages/h5-builder/README.md#L106-L125)
- [demo-progressive.tsx](file://packages/h5-builder/src/demo-progressive.tsx#L1-L263)
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts#L100-L735)

### 5. Rendering with ModelRenderer

The final step in the workflow is rendering the constructed model tree using the `ModelRenderer` component. This component acts as a bridge between the model layer and the view layer, dynamically selecting and rendering the appropriate view for each model.

```tsx
export const ModelRenderer: React.FC<ModelRendererProps> = ({ model }) => {
  const ViewComponent = modelViewMap.get(model.constructor);
  
  if (ViewComponent) {
    return <ViewComponent model={model} />;
  }
  
  // Handle special cases like placeholders and container components
  if (model instanceof BaseContainerModel) {
    return (
      <div className="container-default">
        {model.children.map((child: any) => (
          <ModelRenderer key={child.id} model={child} />
        ))}
      </div>
    );
  }
  
  return <div className="placeholder unknown-placeholder">Unknown component type</div>;
};
```

The `ModelRenderer` uses a mapping system to associate model classes with their corresponding view components. It handles various special cases, including error states, loading states, and container components that need to render their children.

**Section sources**
- [model-renderer.tsx](file://packages/h5-builder/src/components/model-renderer.tsx#L1-L105)
- [README.md](file://packages/h5-builder/README.md#L124-L125)

## Running the Demo Application

To run the demo application and see the H5 Builder Framework in action, use the following command:

```bash
pnpm demo
```

This command starts the Vite development server, which serves the demo application at `http://localhost:3000`. The demo showcases the framework's capabilities, including component loading, data fetching, and reactive rendering. It demonstrates the complete lifecycle of a component-based application, from initialization to rendering and interaction.

The demo application uses a progressive rendering approach, where the component tree is built and initialized in stages. This allows for better performance and user experience, particularly in complex applications with many components.

**Section sources**
- [package.json](file://packages/h5-builder/package.json#L12)
- [demo-progressive.tsx](file://packages/h5-builder/src/demo-progressive.tsx#L1-L263)
- [README.md](file://packages/h5-builder/README.md#L153-L156)

## Executing Tests

The H5 Builder Framework includes a comprehensive test suite to ensure reliability and maintainability. Tests can be executed using the following commands:

```bash
# Run all tests
pnpm test

# Run tests with coverage reporting
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

The testing framework is based on Vitest, which provides fast test execution and excellent TypeScript support. The test suite includes unit tests for individual components, integration tests for component interactions, and end-to-end tests for complete workflows.

Tests are located in the `__tests__` directories throughout the codebase and cover critical functionality such as model initialization, data fetching, error handling, and component rendering. The framework maintains high test coverage (96+ test cases) to ensure stability and prevent regressions.

**Section sources**
- [package.json](file://packages/h5-builder/package.json#L9-L11)
- [README.md](file://packages/h5-builder/README.md#L140-L148)

## Troubleshooting Common Issues

When getting started with the H5 Builder Framework, developers may encounter several common issues. This section provides guidance on identifying and resolving these problems.

### TypeScript Decorator Issues

If you encounter errors related to decorators, ensure that your `tsconfig.json` file includes the required settings:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

These settings are essential for the dependency injection system to function correctly. Without them, decorator syntax will not be recognized, and dependency injection will fail.

### Component Registration Problems

If components are not rendering correctly, verify that they have been properly registered with the `ComponentLoader`:

```typescript
loader.register('ProductCard', ProductCardModel);
```

Ensure that the component type in the schema matches the registration key exactly, as the framework performs exact string matching when resolving component types.

### Service Injection Failures

When services fail to inject, check that they have been registered with the injector:

```typescript
injector.registerInstance(HttpService, createHttpService(bridge));
```

Also verify that the service identifier used in the `@Inject` decorator matches the one used during registration. Mismatched identifiers will result in injection failures.

### Data Loading Issues

For problems with data loading, examine the model's `onInit` method and ensure that asynchronous operations are properly awaited:

```typescript
protected async onInit(): Promise<void> {
  this.data = await this.http.get(`/api/product/${this.props.productId}`);
}
```

Remember that `onInit` must return a Promise, even for synchronous operations, to maintain consistency in the component lifecycle.

### View Rendering Problems

If views are not updating reactively, ensure that:

1. The view component is wrapped with the `observer` HOC
2. Observable properties are accessed directly within the render function
3. The model-view mapping is correctly registered

```typescript
registerModelView(ProductCardModel, ProductCardView);
```

These troubleshooting tips address the most common issues encountered when starting with the H5 Builder Framework. By following these guidelines, developers can quickly resolve problems and focus on building robust, maintainable applications.

**Section sources**
- [README.md](file://packages/h5-builder/README.md#L130-L137)
- [tsconfig.json](file://packages/h5-builder/tsconfig.json#L20-L21)
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts#L119-L127)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts#L73-L103)
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts#L125-L130)
- [model-renderer.tsx](file://packages/h5-builder/src/components/model-renderer.tsx#L34-L37)