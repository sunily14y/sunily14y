"""
Test suite for NIFTY 50 Options Trading App - Live Data Only Mode
Tests that all mock data has been removed and app uses only live Zerodha data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMarketDataLiveOnly:
    """Test that market data endpoints return live data only (no mock)"""
    
    def test_spot_price_returns_live_data(self):
        """API /api/market/spot should return live price with is_live=true when connected"""
        response = requests.get(f"{BASE_URL}/api/market/spot")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "spot_price" in data
        assert "is_live" in data
        assert "is_connected" in data
        assert "timestamp" in data
        
        # When connected, should have live data
        if data["is_connected"]:
            assert data["is_live"] == True
            assert data["spot_price"] > 0
            # NIFTY 50 should be in reasonable range (20000-30000)
            assert 20000 < data["spot_price"] < 35000
            print(f"✓ Live spot price: {data['spot_price']}")
        else:
            # When disconnected, should return 0 and is_live=false
            assert data["is_live"] == False
            assert data["spot_price"] == 0
            print("✓ Disconnected state - no mock data returned")
    
    def test_spot_history_returns_live_history(self):
        """API /api/market/spot-history should return live history from DB"""
        response = requests.get(f"{BASE_URL}/api/market/spot-history", params={"minutes": 60})
        assert response.status_code == 200
        
        data = response.json()
        assert "history" in data
        assert "is_live" in data
        assert "is_connected" in data
        
        # History should be a list
        assert isinstance(data["history"], list)
        
        if data["is_connected"] and len(data["history"]) > 0:
            # Verify history items have correct structure
            for item in data["history"]:
                assert "timestamp" in item
                assert "price" in item
                assert item["price"] > 0
            print(f"✓ Live history returned with {len(data['history'])} data points")
        else:
            print("✓ No history available (empty or disconnected)")
    
    def test_options_chain_returns_live_or_empty(self):
        """API /api/market/options-chain should return live data or empty when disconnected"""
        response = requests.get(f"{BASE_URL}/api/market/options-chain")
        assert response.status_code == 200
        
        data = response.json()
        assert "spot_price" in data
        assert "is_live" in data
        assert "is_connected" in data
        assert "chain" in data
        
        if data["is_connected"]:
            assert data["spot_price"] > 0
            print(f"✓ Options chain with spot price: {data['spot_price']}")
        else:
            assert data["spot_price"] == 0
            assert data["chain"] == []
            print("✓ Disconnected - empty options chain returned")


class TestAuthStatus:
    """Test authentication status endpoint"""
    
    def test_auth_status_endpoint(self):
        """Check if Zerodha authentication is active"""
        response = requests.get(f"{BASE_URL}/api/auth/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_authenticated" in data
        
        if data["is_authenticated"]:
            assert "zerodha_user_id" in data
            print(f"✓ Authenticated with Zerodha user: {data.get('zerodha_user_id')}")
        else:
            print("✓ Not authenticated with Zerodha")


class TestSessionManagement:
    """Test session creation and management"""
    
    def test_create_session(self):
        """Create a new trading session"""
        response = requests.post(f"{BASE_URL}/api/session/create")
        assert response.status_code == 200
        
        data = response.json()
        assert "session_id" in data
        assert "config" in data
        assert len(data["session_id"]) > 0
        
        # Verify default config
        config = data["config"]
        assert config["trading_mode"] == "paper"
        assert config["lot_size"] >= 1
        
        print(f"✓ Session created: {data['session_id'][:8]}...")
        return data["session_id"]
    
    def test_get_session(self):
        """Get session details"""
        # First create a session
        create_response = requests.post(f"{BASE_URL}/api/session/create")
        session_id = create_response.json()["session_id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/session/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == session_id
        print(f"✓ Session retrieved successfully")
    
    def test_update_config(self):
        """Update session configuration"""
        # Create session
        create_response = requests.post(f"{BASE_URL}/api/session/create")
        session_id = create_response.json()["session_id"]
        
        # Update config
        new_config = {
            "lot_size": 2,
            "adjustment_zone": 75,
            "strike_distance": 250,
            "trading_mode": "paper"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/session/{session_id}/config",
            json=new_config
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["config"]["lot_size"] == 2
        assert data["config"]["adjustment_zone"] == 75
        print(f"✓ Config updated successfully")


class TestStrategyStartWithLiveData:
    """Test strategy start behavior with live data requirement"""
    
    def test_strategy_start_requires_live_data(self):
        """Strategy start should fail gracefully with 503/520 if no live data"""
        # Create a new session (without Zerodha auth)
        create_response = requests.post(f"{BASE_URL}/api/session/create")
        session_id = create_response.json()["session_id"]
        
        # Try to start strategy
        response = requests.post(
            f"{BASE_URL}/api/strategy/start",
            params={"session_id": session_id}
        )
        
        # If live data is available, it should succeed
        # If not, it should return 503 (or 520 from Cloudflare proxy)
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert data["spot_price"] > 0
            print(f"✓ Strategy started with live data at spot: {data['spot_price']}")
            
            # Stop the strategy to clean up
            requests.post(f"{BASE_URL}/api/strategy/stop", params={"session_id": session_id})
        elif response.status_code in [503, 520]:
            # 520 is Cloudflare's "Web server is returning an unknown error"
            # which wraps the 503 from our backend
            data = response.json()
            detail = data.get("detail", "")
            assert "Disconnected" in detail or "live data" in detail.lower() or "option prices" in detail.lower()
            print(f"✓ Strategy correctly rejected - no live data: {detail}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestNoSimulatedDataText:
    """Verify no 'Simulated' text in API responses"""
    
    def test_spot_response_no_simulated_text(self):
        """Spot price response should not contain 'simulated' text"""
        response = requests.get(f"{BASE_URL}/api/market/spot")
        response_text = response.text.lower()
        
        assert "simulated" not in response_text
        assert "mock" not in response_text
        print("✓ No 'simulated' or 'mock' text in spot response")
    
    def test_history_response_no_simulated_text(self):
        """History response should not contain 'simulated' text"""
        response = requests.get(f"{BASE_URL}/api/market/spot-history", params={"minutes": 5})
        response_text = response.text.lower()
        
        assert "simulated" not in response_text
        assert "mock" not in response_text
        print("✓ No 'simulated' or 'mock' text in history response")


class TestStrategyState:
    """Test strategy state endpoint"""
    
    def test_strategy_state_includes_connection_status(self):
        """Strategy state should include is_connected field"""
        # Create session
        create_response = requests.post(f"{BASE_URL}/api/session/create")
        session_id = create_response.json()["session_id"]
        
        response = requests.get(f"{BASE_URL}/api/strategy/state/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_connected" in data
        assert "is_live_data" in data
        print(f"✓ Strategy state includes connection status: is_connected={data['is_connected']}")


class TestPositionsWithLiveData:
    """Test positions endpoint with live data"""
    
    def test_positions_include_connection_status(self):
        """Positions endpoint should include is_connected field"""
        # Create session
        create_response = requests.post(f"{BASE_URL}/api/session/create")
        session_id = create_response.json()["session_id"]
        
        response = requests.get(f"{BASE_URL}/api/positions/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "positions" in data
        assert "is_connected" in data
        assert "is_live_data" in data
        print(f"✓ Positions endpoint includes connection status")


class TestRootEndpoint:
    """Test root API endpoint"""
    
    def test_root_endpoint(self):
        """Root endpoint should return API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "kite_configured" in data
        print(f"✓ API root working, Kite configured: {data['kite_configured']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
