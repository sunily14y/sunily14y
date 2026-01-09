#!/usr/bin/env python3
"""
UNO Game Backend API Testing Suite
Tests all backend API endpoints with comprehensive scenarios
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any

# Get backend URL from frontend .env
BACKEND_URL = "https://uno-cards-4.preview.emergentagent.com/api"

class UNOBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["message", "version"]
                
                if all(key in data for key in expected_keys):
                    if data["message"] == "UNO Game API" and data["version"] == "1.0.0":
                        self.log_test("Root endpoint", True, f"Response: {data}")
                        return True
                    else:
                        self.log_test("Root endpoint", False, f"Unexpected response content: {data}")
                else:
                    self.log_test("Root endpoint", False, f"Missing keys in response: {data}")
            else:
                self.log_test("Root endpoint", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Root endpoint", False, f"Exception: {str(e)}")
        
        return False
    
    def test_create_game_result(self):
        """Test POST /api/games - Create game result"""
        test_cases = [
            {
                "name": "Valid AI Easy Win",
                "data": {
                    "player_name": "Alice Johnson",
                    "won": True,
                    "difficulty": "easy",
                    "opponent_type": "ai"
                }
            },
            {
                "name": "Valid AI Medium Loss",
                "data": {
                    "player_name": "Bob Smith",
                    "won": False,
                    "difficulty": "medium",
                    "opponent_type": "ai"
                }
            },
            {
                "name": "Valid Human Win",
                "data": {
                    "player_name": "Charlie Brown",
                    "won": True,
                    "difficulty": "hard",
                    "opponent_type": "human"
                }
            },
            {
                "name": "Another Alice Win",
                "data": {
                    "player_name": "Alice Johnson",
                    "won": True,
                    "difficulty": "hard",
                    "opponent_type": "ai"
                }
            },
            {
                "name": "Diana Loss",
                "data": {
                    "player_name": "Diana Prince",
                    "won": False,
                    "difficulty": "easy",
                    "opponent_type": "human"
                }
            }
        ]
        
        created_games = []
        
        for test_case in test_cases:
            try:
                response = self.session.post(
                    f"{self.base_url}/games",
                    json=test_case["data"],
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["id", "player_name", "won", "difficulty", "opponent_type", "timestamp"]
                    
                    if all(field in data for field in required_fields):
                        # Verify data matches input
                        input_data = test_case["data"]
                        if (data["player_name"] == input_data["player_name"] and
                            data["won"] == input_data["won"] and
                            data["difficulty"] == input_data["difficulty"] and
                            data["opponent_type"] == input_data["opponent_type"]):
                            
                            self.log_test(f"Create game - {test_case['name']}", True, f"Game ID: {data['id']}")
                            created_games.append(data)
                        else:
                            self.log_test(f"Create game - {test_case['name']}", False, "Response data doesn't match input")
                    else:
                        missing_fields = [f for f in required_fields if f not in data]
                        self.log_test(f"Create game - {test_case['name']}", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test(f"Create game - {test_case['name']}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Create game - {test_case['name']}", False, f"Exception: {str(e)}")
        
        return created_games
    
    def test_get_leaderboard(self):
        """Test GET /api/leaderboard - Get leaderboard"""
        try:
            response = self.session.get(f"{self.base_url}/leaderboard")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check structure of leaderboard entries
                        required_fields = ["player_name", "wins", "total_games", "win_rate"]
                        first_entry = data[0]
                        
                        if all(field in first_entry for field in required_fields):
                            # Verify sorting (by wins descending)
                            is_sorted = True
                            for i in range(len(data) - 1):
                                if data[i]["wins"] < data[i + 1]["wins"]:
                                    is_sorted = False
                                    break
                            
                            if is_sorted:
                                # Verify win rate calculations
                                win_rates_correct = True
                                for entry in data:
                                    expected_rate = (entry["wins"] / entry["total_games"]) * 100 if entry["total_games"] > 0 else 0
                                    if abs(entry["win_rate"] - expected_rate) > 0.01:  # Allow small floating point differences
                                        win_rates_correct = False
                                        break
                                
                                if win_rates_correct:
                                    self.log_test("Get leaderboard", True, f"Found {len(data)} players, properly sorted and calculated")
                                    return data
                                else:
                                    self.log_test("Get leaderboard", False, "Win rate calculations are incorrect")
                            else:
                                self.log_test("Get leaderboard", False, "Leaderboard not sorted by wins")
                        else:
                            missing_fields = [f for f in required_fields if f not in first_entry]
                            self.log_test("Get leaderboard", False, f"Missing fields in entries: {missing_fields}")
                    else:
                        self.log_test("Get leaderboard", True, "Empty leaderboard (no games yet)")
                        return []
                else:
                    self.log_test("Get leaderboard", False, f"Response is not a list: {type(data)}")
            else:
                self.log_test("Get leaderboard", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Get leaderboard", False, f"Exception: {str(e)}")
        
        return None
    
    def test_get_player_stats(self, player_names: List[str]):
        """Test GET /api/stats/{player_name} - Get player statistics"""
        
        # Test existing players
        for player_name in player_names:
            try:
                response = self.session.get(f"{self.base_url}/stats/{player_name}")
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["player_name", "wins", "losses", "total_games", "win_rate", "games_vs_ai", "games_vs_human"]
                    
                    if all(field in data for field in required_fields):
                        # Verify data consistency
                        if (data["wins"] + data["losses"] == data["total_games"] and
                            data["games_vs_ai"] + data["games_vs_human"] == data["total_games"]):
                            
                            # Verify win rate calculation
                            expected_rate = (data["wins"] / data["total_games"]) * 100 if data["total_games"] > 0 else 0
                            if abs(data["win_rate"] - expected_rate) < 0.01:
                                self.log_test(f"Player stats - {player_name}", True, f"Stats: {data['wins']}W/{data['losses']}L, {data['win_rate']:.1f}% win rate")
                            else:
                                self.log_test(f"Player stats - {player_name}", False, f"Win rate calculation incorrect: expected {expected_rate}, got {data['win_rate']}")
                        else:
                            self.log_test(f"Player stats - {player_name}", False, "Data inconsistency in game counts")
                    else:
                        missing_fields = [f for f in required_fields if f not in data]
                        self.log_test(f"Player stats - {player_name}", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test(f"Player stats - {player_name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Player stats - {player_name}", False, f"Exception: {str(e)}")
        
        # Test non-existent player (should return empty stats)
        try:
            response = self.session.get(f"{self.base_url}/stats/NonExistentPlayer123")
            
            if response.status_code == 200:
                data = response.json()
                if (data["wins"] == 0 and data["losses"] == 0 and data["total_games"] == 0 and
                    data["win_rate"] == 0.0 and data["games_vs_ai"] == 0 and data["games_vs_human"] == 0):
                    self.log_test("Player stats - Non-existent player", True, "Returns empty stats for new player")
                else:
                    self.log_test("Player stats - Non-existent player", False, f"Non-zero stats for new player: {data}")
            else:
                self.log_test("Player stats - Non-existent player", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Player stats - Non-existent player", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("UNO GAME BACKEND API TESTING")
        print("=" * 60)
        print(f"Testing backend at: {self.base_url}")
        print()
        
        # Test 1: Root endpoint
        print("1. Testing Root Endpoint...")
        root_success = self.test_root_endpoint()
        print()
        
        # Test 2: Create game results
        print("2. Testing Create Game Results...")
        created_games = self.test_create_game_result()
        print()
        
        # Test 3: Get leaderboard
        print("3. Testing Leaderboard...")
        leaderboard = self.test_get_leaderboard()
        print()
        
        # Test 4: Get player stats
        print("4. Testing Player Statistics...")
        if created_games:
            unique_players = list(set(game["player_name"] for game in created_games))
            self.test_get_player_stats(unique_players)
        else:
            print("   Skipping player stats test - no games created successfully")
        print()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "No tests run")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = UNOBackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the details above.")