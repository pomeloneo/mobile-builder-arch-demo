import { makeEntryContext, makeUserInputContext } from './context';

describe('context', () => {
  it('bind', () => {
    const context = makeEntryContext();
    expect(context.getValue('lvweb')).toBeUndefined();
    context.setValue('lvweb', true);
    expect(context.getValue('lvweb')).toBeTruthy();
  });

  it('background', () => {
    const context = makeUserInputContext();
    context.setValue('lvweb', true);
    const newContext = context.background();
    expect(newContext.getValue('lvweb')).toBeUndefined();
  });
});
