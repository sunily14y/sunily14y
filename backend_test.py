#!/usr/bin/env python3
"""
Backend API Testing for NiftyAlgo Trading System
Tests all API endpoints for the automated option selling algo
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class NiftyAlgoAPITester:
    def __init__(self, base_url: str = "https://zerotrades.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_id: Optional[str] = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}
                
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}
    
    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)
    
    def test_create_session(self):
        """Test session creation"""
        success, response = self.run_test("Create Session", "POST", "session/create", 200)
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            self.log(f"   Session ID: {self.session_id}")
            return True, response
        return False, {}
    
    def test_get_session(self):
        """Test getting session details"""
        if not self.session_id:
            self.log("❌ Get Session - No session ID available")
            return False, {}
        
        return self.run_test("Get Session", "GET", f"session/{self.session_id}", 200)
    
    def test_update_config(self):
        """Test updating strategy configuration"""
        if not self.session_id:
            self.log("❌ Update Config - No session ID available")
            return False, {}
        
        config_data = {
            "lot_size": 2,
            "adjustment_zone": 75,
            "strike_distance": 250,
            "max_daily_loss": 5000.0,
            "trading_mode": "paper"
        }
        
        return self.run_test("Update Config", "PUT", f"session/{self.session_id}/config", 200, config_data)
    
    def test_market_data_endpoints(self):
        """Test all market data endpoints"""
        results = []
        
        # Test spot price
        success, _ = self.run_test("Get NIFTY Spot", "GET", "market/spot", 200)
        results.append(success)
        
        # Test options chain
        success, _ = self.run_test("Get Options Chain", "GET", "market/options-chain", 200)
        results.append(success)
        
        # Test spot history
        success, _ = self.run_test("Get Spot History", "GET", "market/spot-history", 200, params={"minutes": 30})
        results.append(success)
        
        return all(results)
    
    def test_strategy_management(self):
        """Test strategy start/stop functionality"""
        if not self.session_id:
            self.log("❌ Strategy Management - No session ID available")
            return False
        
        results = []
        
        # Test strategy state (should be inactive initially)
        success, state = self.run_test("Get Strategy State", "GET", f"strategy/state/{self.session_id}", 200)
        results.append(success)
        if success:
            self.log(f"   Initial state: {'Active' if state.get('is_active') else 'Inactive'}")
        
        # Test start strategy
        success, start_response = self.run_test("Start Strategy", "POST", "strategy/start", 200, 
                                               params={"session_id": self.session_id})
        results.append(success)
        if success:
            self.log(f"   Strategy started: CE {start_response.get('ce_strike')}, PE {start_response.get('pe_strike')}")
        
        # Wait a moment for strategy to initialize
        import time
        time.sleep(2)
        
        # Test strategy state after start (should be active)
        success, active_state = self.run_test("Get Active Strategy State", "GET", f"strategy/state/{self.session_id}", 200)
        results.append(success)
        if success:
            self.log(f"   Active state: {'Active' if active_state.get('is_active') else 'Inactive'}")
        
        # Test positions
        success, positions = self.run_test("Get Positions", "GET", f"positions/{self.session_id}", 200)
        results.append(success)
        if success:
            pos_count = len(positions.get('positions', []))
            self.log(f"   Positions count: {pos_count}")
        
        # Test stop strategy
        success, stop_response = self.run_test("Stop Strategy", "POST", "strategy/stop", 200,
                                              params={"session_id": self.session_id})
        results.append(success)
        if success:
            self.log(f"   Strategy stopped. P&L: ₹{stop_response.get('total_pnl', 0)}")
        
        return all(results)
    
    def test_trades_and_stats(self):
        """Test trades and statistics endpoints"""
        if not self.session_id:
            self.log("❌ Trades and Stats - No session ID available")
            return False
        
        results = []
        
        # Test trades
        success, trades = self.run_test("Get Trades", "GET", f"trades/{self.session_id}", 200, 
                                       params={"limit": 10})
        results.append(success)
        if success:
            trade_count = len(trades.get('trades', []))
            total_trades = trades.get('total', 0)
            self.log(f"   Trades: {trade_count} returned, {total_trades} total")
        
        # Test stats
        success, stats = self.run_test("Get Stats", "GET", f"stats/{self.session_id}", 200)
        results.append(success)
        if success:
            self.log(f"   Stats: {stats.get('total_trades', 0)} trades, {stats.get('adjustment_count', 0)} adjustments")
        
        return all(results)
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        if not self.session_id:
            self.log("❌ Auth Endpoints - No session ID available")
            return False
        
        results = []
        
        # Test login URL
        success, login_data = self.run_test("Get Login URL", "GET", "auth/login-url", 200,
                                           params={"session_id": self.session_id})
        results.append(success)
        if success:
            is_mock = login_data.get('is_mock', False)
            self.log(f"   Login URL type: {'Mock' if is_mock else 'Real'}")
        
        # Test auth callback
        success, _ = self.run_test("Auth Callback", "POST", "auth/callback", 200,
                                  params={"session_id": self.session_id, "request_token": "mock_token"})
        results.append(success)
        
        return all(results)
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting NiftyAlgo API Comprehensive Test")
        self.log("=" * 60)
        
        # Test 1: Basic API connectivity
        self.log("\n📡 Testing Basic Connectivity")
        self.test_root_endpoint()
        
        # Test 2: Session management
        self.log("\n👤 Testing Session Management")
        session_success, _ = self.test_create_session()
        if session_success:
            self.test_get_session()
            self.test_update_config()
        
        # Test 3: Authentication
        self.log("\n🔐 Testing Authentication")
        self.test_auth_endpoints()
        
        # Test 4: Market data
        self.log("\n📊 Testing Market Data")
        self.test_market_data_endpoints()
        
        # Test 5: Strategy management (most critical)
        self.log("\n⚡ Testing Strategy Management")
        strategy_success = self.test_strategy_management()
        
        # Test 6: Trades and statistics
        self.log("\n📈 Testing Trades and Statistics")
        self.test_trades_and_stats()
        
        # Final results
        self.log("\n" + "=" * 60)
        self.log(f"🏁 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                self.log(f"   - {failure.get('test', 'Unknown')}: {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"📊 Success Rate: {success_rate:.1f}%")
        
        # Return overall success (>80% pass rate for backend)
        return success_rate >= 80, {
            'total_tests': self.tests_run,
            'passed_tests': self.tests_passed,
            'failed_tests': len(self.failed_tests),
            'success_rate': success_rate,
            'failures': self.failed_tests,
            'session_id': self.session_id,
            'strategy_working': strategy_success
        }

def main():
    """Main test execution"""
    tester = NiftyAlgoAPITester()
    
    try:
        success, results = tester.run_comprehensive_test()
        
        # Save results to file for reference
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())