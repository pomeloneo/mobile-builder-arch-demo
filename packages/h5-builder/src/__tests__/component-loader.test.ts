import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentLoader, ComponentSchema } from '../flow/component-loader';
import { Injector } from '../kernel/di';
import { BaseComponentModel, BaseContainerModel } from '../kernel/model';
import { TrackerService } from '../modules/tracker.service';
import { BridgeService } from '../modules/bridge.service';
import { ErrorPlaceholderModel } from '../flow/placeholders';

// 测试用的简单组件
class TestCardModel extends BaseComponentModel<{ title: string }> {
  protected onInit(): void {
    // 空实现
  }
}

// 测试用的容器组件
class TestContainerModel extends BaseContainerModel {
  protected onInit(): void {
    // 空实现
  }
}

describe('ComponentLoader', () => {
  let injector: Injector;
  let tracker: TrackerService;
  let loader: ComponentLoader;

  beforeEach(() => {
    injector = new Injector(undefined, 'TestInjector');

    const bridge = new BridgeService(true);
    tracker = new TrackerService(bridge, { debug: false });

    injector.registerInstance(TrackerService, tracker);

    loader = new ComponentLoader(injector, tracker);
  });

  describe('Component Registration', () => {
    it('should register single component', () => {
      loader.register('TestCard', TestCardModel);

      const info = loader.getRegistryInfo();
      expect(info.totalComponents).toBe(1);
      expect(info.types).toContain('TestCard');
    });

    it('should register multiple components', () => {
      loader.registerAll({
        'TestCard': TestCardModel,
        'TestContainer': TestContainerModel,
      });

      const info = loader.getRegistryInfo();
      expect(info.totalComponents).toBe(2);
      expect(info.types).toContain('TestCard');
      expect(info.types).toContain('TestContainer');
    });
  });

  describe('Simple Component Building', () => {
    beforeEach(() => {
      loader.register('TestCard', TestCardModel);
    });

    it('should build simple component', () => {
      const schema: ComponentSchema = {
        type: 'TestCard',
        id: 'card-1',
        props: { title: 'Test Title' },
      };

      const model = loader.buildTree(schema);

      expect(model).toBeInstanceOf(TestCardModel);
      expect(model.id).toBe('card-1');
      expect(model.props.title).toBe('Test Title');
    });

    it('should track component creation', () => {
      const schema: ComponentSchema = {
        type: 'TestCard',
        id: 'card-1',
        props: { title: 'Test' },
      };

      loader.buildTree(schema);

      expect(tracker.queueSize).toBe(1);
    });
  });

  describe('Container Component Building', () => {
    beforeEach(() => {
      loader.registerAll({
        'TestCard': TestCardModel,
        'TestContainer': TestContainerModel,
      });
    });

    it('should build container with children', () => {
      const schema: ComponentSchema = {
        type: 'TestContainer',
        id: 'container-1',
        props: {},
        children: [
          {
            type: 'TestCard',
            id: 'card-1',
            props: { title: 'Card 1' },
          },
          {
            type: 'TestCard',
            id: 'card-2',
            props: { title: 'Card 2' },
          },
        ],
      };

      const model = loader.buildTree(schema) as TestContainerModel;

      expect(model).toBeInstanceOf(TestContainerModel);
      expect(model.children.length).toBe(2);
      expect(model.children[0].id).toBe('card-1');
      expect(model.children[1].id).toBe('card-2');
    });

    it('should build nested containers', () => {
      const schema: ComponentSchema = {
        type: 'TestContainer',
        id: 'root',
        props: {},
        children: [
          {
            type: 'TestContainer',
            id: 'sub-container',
            props: {},
            children: [
              {
                type: 'TestCard',
                id: 'nested-card',
                props: { title: 'Nested' },
              },
            ],
          },
        ],
      };

      const model = loader.buildTree(schema) as TestContainerModel;

      expect(model.children.length).toBe(1);
      expect(model.children[0]).toBeInstanceOf(TestContainerModel);

      const subContainer = model.children[0] as TestContainerModel;
      expect(subContainer.children.length).toBe(1);
      expect(subContainer.children[0].id).toBe('nested-card');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown component type', () => {
      const schema: ComponentSchema = {
        type: 'UnknownType',
        id: 'unknown-1',
        props: {},
      };

      const model = loader.buildTree(schema);

      // Should return error placeholder
      expect(model).toBeInstanceOf(ErrorPlaceholderModel);
      expect(model.id).toBe('error-unknown-1');
    });

    it('should throw error for missing type', () => {
      const schema = {
        id: 'test-1',
        props: {},
      } as ComponentSchema;

      const model = loader.buildTree(schema);

      expect(model).toBeInstanceOf(ErrorPlaceholderModel);
    });

    it('should throw error for missing id', () => {
      loader.register('TestCard', TestCardModel);

      const schema = {
        type: 'TestCard',
        props: {},
      } as ComponentSchema;

      const model = loader.buildTree(schema);

      expect(model).toBeInstanceOf(ErrorPlaceholderModel);
    });

    it('should handle child build errors gracefully', () => {
      loader.registerAll({
        'TestCard': TestCardModel,
        'TestContainer': TestContainerModel,
      });

      const schema: ComponentSchema = {
        type: 'TestContainer',
        id: 'container-1',
        props: {},
        children: [
          {
            type: 'TestCard',
            id: 'good-card',
            props: { title: 'Good' },
          },
          {
            type: 'UnknownType',
            id: 'bad-card',
            props: {},
          },
          {
            type: 'TestCard',
            id: 'another-good-card',
            props: { title: 'Also Good' },
          },
        ],
      };

      const model = loader.buildTree(schema) as TestContainerModel;

      // Should have 3 children (2 good + 1 error placeholder)
      expect(model.children.length).toBe(3);
      expect(model.children[0].id).toBe('good-card');
      expect(model.children[1]).toBeInstanceOf(ErrorPlaceholderModel);
      expect(model.children[2].id).toBe('another-good-card');
    });
  });

  describe('Schema Validation', () => {
    beforeEach(() => {
      loader.register('TestCard', TestCardModel);
    });

    it('should accept valid schema', () => {
      const schema: ComponentSchema = {
        type: 'TestCard',
        id: 'card-1',
        props: { title: 'Test' },
      };

      const model = loader.buildTree(schema);
      expect(model).toBeInstanceOf(TestCardModel);
    });

    it('should handle empty props', () => {
      const schema: ComponentSchema = {
        type: 'TestCard',
        id: 'card-1',
        props: {},
      };

      const model = loader.buildTree(schema);
      expect(model).toBeInstanceOf(TestCardModel);
    });
  });
});
