# """
# Comprehensive Supabase PostgreSQL Connection Test Script

# Run with: python -m app.test_supabase_connection

# Tests:
# 1. DNS resolution (IPv4/IPv6)
# 2. Direct psycopg2 connection
# 3. SQLAlchemy connection
# 4. Connection pooler (port 6543)
# """

# import sys
# import os
# import socket
# import logging

# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
# logger = logging.getLogger(__name__)


# def test_dns_resolution(hostname: str) -> dict:
#     """Test DNS resolution for a hostname."""
#     result = {
#         "hostname": hostname,
#         "ipv4_addresses": [],
#         "ipv6_addresses": [],
#         "can_connect_ipv4": False,
#         "can_connect_ipv6": False,
#     }
    
#     try:
#         addr_info = socket.getaddrinfo(hostname, 5432)
#         for info in addr_info:
#             addr = info[4][0]
#             if ":" in addr:
#                 if addr not in result["ipv6_addresses"]:
#                     result["ipv6_addresses"].append(addr)
#             else:
#                 if addr not in result["ipv4_addresses"]:
#                     result["ipv4_addresses"].append(addr)
#     except socket.gaierror as e:
#         result["error"] = str(e)
    
#     return result


# def test_psycopg2_direct():
#     """Test direct psycopg2 connection."""
#     import psycopg2
#     from urllib.parse import urlparse
    
#     from app.settings import settings
    
#     print("\n" + "=" * 60)
#     print("TEST 2: Direct psycopg2 Connection")
#     print("=" * 60)
    
#     try:
#         parsed = urlparse(settings.DATABASE_URL)
#         print(f"[INFO] Connecting to {parsed.hostname}:{parsed.port or 5432}")
        
#         conn = psycopg2.connect(
#             host=parsed.hostname,
#             port=parsed.port or 5432,
#             database=parsed.path.lstrip("/") or "postgres",
#             user=parsed.username,
#             password=parsed.password,
#             sslmode="require",
#             connect_timeout=10,
#         )
        
#         cur = conn.cursor()
#         cur.execute("SELECT version()")
#         version = cur.fetchone()[0]
#         print(f"[SUCCESS] Connected! PostgreSQL {version.split(' ')[0]}")
        
#         cur.close()
#         conn.close()
#         return True
        
#     except Exception as e:
#         print(f"[ERROR] psycopg2 connection failed: {e}")
#         return False


# def test_sqlalchemy_connection():
#     """Test SQLAlchemy connection."""
#     from sqlalchemy import create_engine, text
    
#     from app.settings import settings
#     from app.database import get_engine
    
#     print("\n" + "=" * 60)
#     print("TEST 3: SQLAlchemy Connection")
#     print("=" * 60)
    
#     try:
#         engine = get_engine()
#         with engine.connect() as conn:
#             result = conn.execute(text("SELECT version()"))
#             version = result.fetchone()[0]
#             print(f"[SUCCESS] SQLAlchemy connected! PostgreSQL {version.split(' ')[0]}")
#             return True
            
#     except Exception as e:
#         print(f"[ERROR] SQLAlchemy connection failed: {e}")
#         return False


# def test_connection_pooler():
#     """Test Supabase connection pooler on port 6543."""
#     import psycopg2
    
#     from app.settings import settings
    
#     print("\n" + "=" * 60)
#     print("TEST 4: Supabase Connection Pooler (PgBouncer)")
#     print("=" * 60)
    
#     from urllib.parse import urlparse
#     parsed = urlparse(settings.DATABASE_URL)
    
#     hostname = parsed.hostname
#     port = 6543
#     user = parsed.username
#     password = parsed.password
#     database = parsed.path.lstrip("/") or "postgres"
    
#     print(f"[INFO] Connecting to pooler at {hostname}:{port}")
#     print(f"[INFO] Database: {database}")
    
#     try:
#         conn = psycopg2.connect(
#             host=hostname,
#             port=port,
#             database=database,
#             user=user,
#             password=password,
#             sslmode="require",
#             connect_timeout=10,
#         )
        
#         cur = conn.cursor()
#         cur.execute("SELECT version()")
#         version = cur.fetchone()[0]
#         print(f"[SUCCESS] Pooler connected! {version.split(' ')[0]}")
        
#         cur.close()
#         conn.close()
#         return True
        
#     except psycopg2.OperationalError as e:
#         error_msg = str(e).lower()
#         if "port 6543" in error_msg or "connection refused" in error_msg:
#             print("[WARNING] Pooler not accessible. This is normal if:")
#             print("          - You're not using Supabase Pro plan")
#             print("          - Pooler is disabled in Supabase dashboard")
#         else:
#             print(f"[ERROR] Pooler connection failed: {e}")
#         return False
#     except Exception as e:
#         print(f"[ERROR] Pooler connection failed: {e}")
#         return False


# def test_ipv4_fallback():
#     """Test connection using resolved IPv4 address."""
#     import psycopg2
    
#     from app.settings import settings
#     from urllib.parse import urlparse
    
#     print("\n" + "=" * 60)
#     print("TEST 5: IPv4 Fallback Connection")
#     print("=" * 60)
    
#     parsed = urlparse(settings.DATABASE_URL)
#     hostname = parsed.hostname
    
#     if not hostname:
#         print("[ERROR] Could not parse hostname")
#         return False
    
#     try:
#         print(f"[INFO] Resolving {hostname} to IPv4...")
#         result = socket.getaddrinfo(hostname, None, socket.AF_INET)
        
#         if not result:
#             print("[WARNING] No IPv4 address found")
#             return False
        
#         ipv4_addr = result[0][4][0]
#         print(f"[INFO] Resolved to: {ipv4_addr}")
        
#         conn = psycopg2.connect(
#             host=ipv4_addr,
#             port=parsed.port or 6543,
#             database=parsed.path.lstrip("/") or "postgres",
#             user=parsed.username,
#             password=parsed.password,
#             sslmode="require",
#             connect_timeout=10,
#             options="-c host={}".format(hostname),
#         )
        
#         cur = conn.cursor()
#         cur.execute("SELECT version()")
#         version = cur.fetchone()[0]
#         print(f"[SUCCESS] IPv4 fallback works! {version.split(' ')[0]}")
        
#         cur.close()
#         conn.close()
#         return True
        
#     except socket.gaierror as e:
#         print(f"[ERROR] IPv4 resolution failed: {e}")
#         return False
#     except Exception as e:
#         print(f"[ERROR] IPv4 fallback connection failed: {e}")
#         return False


# def main():
#     print("=" * 60)
#     print("SUPABASE POSTGRESQL CONNECTION TEST SUITE")
#     print("=" * 60)
    
#     from app.settings import settings
    
#     print("\n" + "-" * 60)
#     print("Configuration:")
#     print("-" * 60)
#     print(f"Environment: {settings.ENVIRONMENT}")
#     print(f"Database Type: PostgreSQL")
#     print(f"Force IPv4: {settings.FORCE_IPV4}")
    
#     from urllib.parse import urlparse
#     parsed = urlparse(settings.DATABASE_URL)
#     print(f"Host: {parsed.hostname}")
#     print(f"Port: {parsed.port or 5432}")
#     print(f"Database: {parsed.path.lstrip('/') or 'postgres'}")
    
#     if parsed.hostname:
#         print("\n" + "-" * 60)
#         print("DNS Resolution Test:")
#         print("-" * 60)
#         dns_result = test_dns_resolution(parsed.hostname)
        
#         if dns_result.get("ipv4_addresses"):
#             print(f"IPv4: {', '.join(dns_result['ipv4_addresses'])}")
#         else:
#             print("IPv4: None found")
        
#         if dns_result.get("ipv6_addresses"):
#             print(f"IPv6: {', '.join(dns_result['ipv6_addresses'])}")
#         else:
#             print("IPv6: None found")
        
#         if dns_result.get("error"):
#             print(f"Error: {dns_result['error']}")
    
#     results = []
    
#     results.append(("psycopg2", test_psycopg2_direct()))
#     results.append(("SQLAlchemy", test_sqlalchemy_connection()))
#     results.append(("Pooler (6543)", test_connection_pooler()))
#     results.append(("IPv4 Fallback", test_ipv4_fallback()))
    
#     print("\n" + "=" * 60)
#     print("SUMMARY")
#     print("=" * 60)
    
#     for name, result in results:
#         status = "PASS" if result else "FAIL"
#         symbol = "[+]" if result else "[-]"
#         print(f"{symbol} {name}: {status}")
    
#     passed = sum(1 for _, r in results if r is True)
#     failed = sum(1 for _, r in results if r is False)
#     skipped = sum(1 for _, r in results if r is None)
    
#     print(f"\nPassed: {passed}, Failed: {failed}, Skipped: {skipped}")
    
#     if failed > 0:
#         print("\nTroubleshooting suggestions:")
#         print("1. Set FORCE_IPV4=true in .env if DNS resolution fails")
#         print("2. Use port 6543 (pooler) instead of 5432 (direct)")
#         print("3. Ensure sslmode=require is in DATABASE_URL")
#         print("4. Check your network/firewall settings")
    
#     return failed == 0


# if __name__ == "__main__":
#     success = main()
#     sys.exit(0 if success else 1)


# # DOUBLE PART 


# import sys
# import os
# import socket
# import logging
# from urllib.parse import urlparse

# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
# logger = logging.getLogger(__name__)

# from app.settings import settings

# DB_URL = settings.DATABASE_URL
# parsed = urlparse(DB_URL)


# def test_dns():
#     """Test DNS resolution for IPv4 and IPv6"""
#     ipv4 = []
#     ipv6 = []
#     try:
#         for info in socket.getaddrinfo(parsed.hostname, 5432):
#             addr = info[4][0]
#             if ":" in addr:
#                 ipv6.append(addr)
#             else:
#                 ipv4.append(addr)
#     except Exception as e:
#         logger.error(f"DNS resolution failed: {e}")
#     print(f"IPv4 addresses: {ipv4 if ipv4 else 'None found'}")
#     print(f"IPv6 addresses: {ipv6 if ipv6 else 'None found'}")
#     return ipv4, ipv6


# def test_psycopg2_connection(host=None, port=None):
#     """Test direct psycopg2 connection"""
#     import psycopg2
#     host = host or parsed.hostname
#     port = port or (parsed.port or 5432)
#     try:
#         conn = psycopg2.connect(
#             host=host,
#             port=port,
#             database=parsed.path.lstrip("/") or "postgres",
#             user=parsed.username,
#             password=parsed.password,
#             sslmode="require",
#             connect_timeout=10
#         )
#         cur = conn.cursor()
#         cur.execute("SELECT version()")
#         version = cur.fetchone()[0]
#         print(f"[SUCCESS] Connected to PostgreSQL {version.split()[0]} at {host}:{port}")
#         cur.close()
#         conn.close()
#         return True
#     except Exception as e:
#         print(f"[ERROR] Connection failed: {e}")
#         return False


# def main():
#     print("=" * 60)
#     print("SUPABASE POSTGRESQL CONNECTION TEST (IPv6 READY)")
#     print("=" * 60)

#     ipv4, ipv6 = test_dns()

#     # Try IPv6 first if available
#     if ipv6:
#         print("\nTrying IPv6 connection...")
#         if test_psycopg2_connection(host=ipv6[0]):
#             return
#     else:
#         print("\nNo IPv6 found.")

#     # Fallback to IPv4 if IPv6 fails
#     if ipv4:
#         print("\nTrying IPv4 fallback...")
#         if test_psycopg2_connection(host=ipv4[0]):
#             return
#     else:
#         print("\nNo IPv4 found; cannot fallback.")

#     print("\nAll connection attempts failed. See instructions below.")


# if __name__ == "__main__":
#     main()


import socket

HOST = "db.idxsczpwrtycmeibssuw.supabase.co"
PORT = 5432

def test_ipv6_connection(host, port):
    try:
        # Force IPv6 socket
        with socket.create_connection((host, port), timeout=5) as sock:
            print(f"[SUCCESS] Connected to {host}:{port} via IPv6")
    except socket.timeout:
        print(f"[TIMEOUT] Cannot reach {host}:{port} (IPv6)")
    except socket.error as e:
        print(f"[ERROR] Cannot reach {host}:{port} (IPv6): {e}")

def test_ipv4_connection(host, port):
    try:
        # Force IPv4 socket
        addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        for family, socktype, proto, canonname, sockaddr in addr_info:
            try:
                with socket.create_connection(sockaddr, timeout=5) as sock:
                    print(f"[SUCCESS] Connected to {host}:{port} via IPv4")
                    return
            except Exception:
                continue
        print(f"[FAIL] Cannot reach {host}:{port} via IPv4")
    except socket.gaierror:
        print(f"[ERROR] Hostname {host} cannot be resolved to IPv4")

if __name__ == "__main__":
    print("Testing IPv6 connectivity...")
    test_ipv6_connection(HOST, PORT)
    
    print("\nTesting IPv4 connectivity...")
    test_ipv4_connection(HOST, PORT)