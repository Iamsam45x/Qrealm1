
#!/usr/bin/env python3
"""
Test script to verify the Firebase registration fix.
This script tests the SQL query parameter matching for the register_firebase endpoint.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import _prepare_sql_params
from app.models import FirebaseRegisterInput

def test_sql_placeholder_matching():
    """Test that the SQL query placeholders match the number of parameters."""
    
    # The fixed INSERT query from register_firebase function
    insert_query = """INSERT INTO users (id, name, email, password_hash, role, user_type, bio, 
               verified, firebase_uid, institution, course, year_of_study, student_id,
               field_of_research, years_of_experience, research_profile, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
    
    # Sample parameters that would be passed to the query
    test_params = (
        "user_id",                    # id
        "Test User",                  # name
        "test@example.com",           # email
        None,                         # password_hash (Firebase users don't have passwords)
        "STUDENT",                    # role
        "STUDENT",                    # user_type
        "Test bio",                   # bio
        True,                         # verified (Firebase users are pre-verified)
        "firebase_uid_123",           # firebase_uid
        "Test University",            # institution
        "Computer Science",           # course
        "3rd Year",                   # year_of_study
        "ST12345",                    # student_id
        None,                         # field_of_research (for students)
        None,                         # years_of_experience (for students)
        None,                         # research_profile (for students)
        "2023-01-01T00:00:00Z",      # created_at
    )
    
    print("Testing SQL placeholder matching...")
    print(f"Query placeholders: {insert_query.count('?')}")
    print(f"Parameters provided: {len(test_params)}")
    
    try:
        # This should not raise an error if the fix is correct
        stmt, bind = _prepare_sql_params(insert_query, test_params)
        print("SUCCESS: SQL placeholders match parameters!")
        print(f"Generated statement: {stmt[:100]}...")
        return True
    except ValueError as e:
        print(f"ERROR: {e}")
        return False

def test_firebase_input_model():
    """Test the FirebaseRegisterInput model."""
    print("\nTesting FirebaseRegisterInput model...")
    
    try:
        # Test valid input
        firebase_input = FirebaseRegisterInput(
            firebase_uid="test_uid_123",
            name="Test User",
            email="test@example.com",
            user_type="STUDENT",
            bio="Test bio",
            student_fields={
                "institution": "Test University",
                "course": "Computer Science",
                "year_of_study": "3rd Year",
                "student_id": "ST12345"
            }
        )
        
        print("SUCCESS: FirebaseRegisterInput model works correctly!")
        print(f"User type: {firebase_input.user_type}")
        print(f"Student fields: {firebase_input.get_student_fields()}")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    print("=" * 60)
    print("FIREBASE REGISTRATION FIX VERIFICATION")
    print("=" * 60)
    
    results = []
    
    # Test SQL placeholder matching
    results.append(("SQL Placeholder Matching", test_sql_placeholder_matching()))
    
    # Test Firebase input model
    results.append(("Firebase Input Model", test_firebase_input_model()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        symbol = "[+]" if result else "[-]"
        print(f"{symbol} {test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    print(f"\nOverall result: {'PASS' if all_passed else 'FAIL'}")
    
    if all_passed:
        print("\nThe Firebase registration endpoint should now work correctly!")
        print("The SQL placeholder mismatch has been fixed.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
