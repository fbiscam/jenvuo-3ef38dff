import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Runs the actual EA target/lock code with a fake MT5 account and close API.
// This tests execution decisions, not historical returns or broker fills.
const source = readFileSync('resources/mt5/Jenvu EA.mq5', 'utf8');
function section(start: string, end: string) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Missing EA section ${start}`);
  return source.slice(a, b);
}
const daily = section('bool MustBreak(', '// END PURE PREDICATES');
const enforcement = section('bool ConfigureDailyTarget(', '// END DAILY LIMIT ENFORCEMENT');
function run(checks: string) {
  const folder = mkdtempSync(join(tmpdir(), 'jenvu-target-'));
  try {
    const cpp = join(folder, 'target.cpp'), binary = join(folder, 'target');
    writeFileSync(cpp, `
      #include <cassert>
      #include <cmath>
      #include <string>
      using string = std::string;
      double g_targetPct=0, g_targetUsd=0;
      bool locked=false, closeFails=false, lockedAtClose=false;
      int closeCalls=0, openPositions=3;
      int StringFind(string text,string value) { auto p=text.find(value); return p==string::npos?-1:(int)p; }
      bool DayLocked() { return locked; }
      string GvLock() { return "account-utc-day"; }
      void GlobalVariableSet(string,double) { locked=true; }
      void CloseAllMine() { closeCalls++; lockedAtClose=locked; if(!closeFails)openPositions=0; }
      void Print(string) {}
      ${daily}
      ${enforcement}
      int main() { ${checks} }
    `);
    execFileSync('g++', ['-std=c++17', cpp, '-o', binary]);
    execFileSync(binary, []);
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

describe('actual Jenvu EA floating-equity daily stop', () => {
  for (const [plan, cap] of [['pro', 50], ['elite', 100], ['ultra', 150], ['free', 10]] as const) {
    it(`${plan}: locks at exactly $${cap} on a $2,500 starting balance, including floating P/L`, () => {
      run(`
        assert(ConfigureDailyTarget(R"({"valid":true,"plan":"${plan}"})"));
        assert(DailyTargetAmount(2500,g_targetPct,g_targetUsd)==${cap});
        assert(!EnforceDailyLimits(2500,2500+${cap}-0.01));
        assert(!locked && closeCalls==0 && openPositions==3);
        // Closed P/L $0, floating P/L alone reaches the cap.
        assert(EnforceDailyLimits(2500,2500+${cap}));
        assert(locked && lockedAtClose && closeCalls==1 && openPositions==0);
      `);
    });
  }
  it('uses net closed plus floating profit, rather than gross floating profit', () => {
    run(`
      assert(ConfigureDailyTarget(R"({"plan":"pro"})"));
      // $20 closed loss + $69.99 floating profit is below the $50 cap.
      assert(!EnforceDailyLimits(2500,2480+69.99));
      assert(EnforceDailyLimits(2500,2480+70));
      assert(openPositions==0 && locked);
    `);
  });
  it('sets the lock before close attempts and retries even after equity falls below the cap', () => {
    run(`
      assert(ConfigureDailyTarget(R"({"plan":"pro"})"));
      closeFails=true;
      assert(EnforceDailyLimits(2500,2550));
      assert(lockedAtClose && openPositions==3);
      assert(EnforceDailyLimits(2500,2540));
      assert(closeCalls==2 && openPositions==3);
      closeFails=false;
      assert(EnforceDailyLimits(2500,2535));
      assert(closeCalls==3 && openPositions==0 && locked);
    `);
  });
  it('keeps a pre-existing day lock after restart and prevents further trading that day', () => {
    run(`
      assert(ConfigureDailyTarget(R"({"plan":"pro"})"));
      locked=true;
      assert(EnforceDailyLimits(2500,2500));
      assert(closeCalls==1 && openPositions==0);
    `);
  });
  it('retains the separate 4.5% emergency loss limit', () => {
    run(`
      assert(ConfigureDailyTarget(R"({"plan":"pro"})"));
      assert(!EnforceDailyLimits(2500,2387.51));
      assert(EnforceDailyLimits(2500,2387.50));
      assert(locked && openPositions==0);
    `);
  });
  it('rejects an unknown plan and clears stale target settings', () => {
    run(`
      assert(ConfigureDailyTarget(R"({"plan":"ultra"})"));
      assert(!ConfigureDailyTarget(R"({"plan":"unknown"})"));
      assert(g_targetPct==0 && g_targetUsd==0);
      assert(!MustTakeProfit(0,100,2,0));
    `);
  });
});