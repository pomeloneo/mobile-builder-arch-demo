import { CapabilityStatus, Capability, SharedCapability } from './capability';

describe('Capability', () => {
  // 初始化
  it('init', () => {
    const capability = new Capability();
    // 初始化完成，默认是没有锁状态
    expect(capability.status).toBe(CapabilityStatus.Unlocked);
  });

  // 获取控制权成功
  it('acquire success', () => {
    const capability = new Capability();
    expect(capability.status).toBe(CapabilityStatus.Unlocked);
    capability.acquire();
    expect(capability.status).toBe(CapabilityStatus.Locked);
  });

  // 获取控制权失败
  it('acquire fail', () => {
    const capability = new Capability();
    capability.acquire();
    expect(() => {
      capability.acquire();
    }).toThrowError();
  });

  // 释放控制权成功
  it('release success', () => {
    let locked = false;
    const capability = new Capability();
    capability.onUnlocked(() => {
      locked = false;
    });
    expect(capability.status).toBe(CapabilityStatus.Unlocked);
    capability.acquire();
    locked = true;
    expect(capability.status).toBe(CapabilityStatus.Locked);
    expect(locked).toBeTruthy();

    capability.release();
    expect(capability.status).toBe(CapabilityStatus.Unlocked);
    expect(locked).toBeFalsy();
  });

  // 直接释放控制权失败
  it('release fail1', () => {
    const capability = new Capability();
    expect(() => {
      capability.release();
    }).toThrowError();
  });

  // 重复释放控制权失败
  it('release fail2', () => {
    const capability = new Capability();
    capability.acquire();
    capability.release();
    expect(() => {
      capability.release();
    }).toThrowError();
  });
});

describe('SharedCapability', () => {
  // 初始化
  it('init', () => {
    const capability = new SharedCapability();
    // 初始化完成，默认是没有锁状态
    expect(capability.status).toBe(CapabilityStatus.Unlocked);
  });

  // 获取控制权成功
  it('acquire success', () => {
    const capability = new SharedCapability();
    capability.acquire();
    expect(capability.status).toBe(CapabilityStatus.Locked);
    expect(() => {
      capability.acquire();
    }).not.toThrowError();
  });

  // 释放控制权成功
  it('release success', () => {
    const capability = new SharedCapability();
    capability.acquire();
    expect(capability.status).toBe(CapabilityStatus.Locked);
    capability.acquire();
    expect(() => {
      capability.release();
      capability.release();
    }).not.toThrowError();
    expect(capability.status).toBe(CapabilityStatus.Unlocked);
  });

  // 释放控制权失败
  it('release fail', () => {
    const capability = new SharedCapability();
    capability.acquire();
    expect(capability.status).toBe(CapabilityStatus.Locked);
    capability.acquire();
    expect(() => {
      capability.release();
      capability.release();
    }).not.toThrowError();
    expect(() => {
      capability.release();
    }).toThrowError();
  });
});
