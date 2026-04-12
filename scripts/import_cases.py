#!/usr/bin/env python3
"""Import cases and clients from Excel file into Supabase."""

import openpyxl
import requests
import re
import json
import sys
from datetime import datetime

SUPABASE_URL = "https://lbaqrfbobfomkcfmfahq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXFyZmJvYmZvbWtjZm1mYWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjE5MzQsImV4cCI6MjA2NTIzNzkzNH0.1MaoZ8omIIOfv0tdGEZj7y6DLiWtCKxNoXlo7ipnxTc"
COMPANY_ID = "a0000000-0000-0000-0000-000000000002"  # שפרגר ושות׳

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

# Meta rows to skip
SKIP_CLIENTS = {"לקוחות פוטנציאליים", "מסמכים משפטיים", "", None}

def parse_client_name(raw):
    """Extract name and ID number from client field like 'אבגיל סרינה 60686235'."""
    if not raw:
        return None, None
    raw = raw.strip()
    # Try to find trailing digits (ID number)
    match = re.match(r'^(.+?)\s+(\d{5,10})\s*$', raw)
    if match:
        return match.group(1).strip(), match.group(2)
    return raw, None


def parse_date(val):
    """Convert Excel date to ISO string."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        # Try DD/MM/YYYY
        for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d.%m.%Y"]:
            try:
                return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
    return None


def parse_number(val):
    """Parse numeric value, return None for 0 or empty."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val != 0 else None
    if isinstance(val, str):
        val = val.strip().replace(",", "")
        if not val or val == "0":
            return None
        try:
            return float(val)
        except ValueError:
            return None
    return None


def clean_str(val):
    """Clean string value."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s != "0" else None


def upsert_batch(table, records, conflict_col=None):
    """Insert records in batches."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    batch_size = 500
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        headers = dict(HEADERS)
        if conflict_col:
            headers["Prefer"] = f"return=minimal,resolution=merge-duplicates"
            url_with_conflict = url + f"?on_conflict={conflict_col}"
        else:
            headers["Prefer"] = "return=minimal"
            url_with_conflict = url

        r = requests.post(url_with_conflict, headers=headers, json=batch)
        if r.status_code not in (200, 201):
            print(f"  Error batch {i}-{i+len(batch)}: {r.status_code} {r.text[:300]}")
        else:
            total += len(batch)
            print(f"  Inserted {total}/{len(records)}")
    return total


def main():
    wb = openpyxl.load_workbook("רשימת תיקים.xlsx")
    ws = wb.active

    print("Reading Excel data...")
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"Total rows: {len(rows)}")

    # Phase 1: Extract unique clients
    print("\n--- Phase 1: Building clients ---")
    clients_map = {}  # name -> client data

    for row in rows:
        raw_client = row[0]
        if not raw_client or raw_client.strip() in SKIP_CLIENTS:
            continue

        name, id_from_name = parse_client_name(raw_client)
        if not name:
            continue

        # Use the most complete data for each client
        id_number = clean_str(row[39]) or id_from_name  # לקוח תז
        email = clean_str(row[38])  # אימייל
        phone = clean_str(row[40])  # לקוח סלולרי
        secondary_phone = clean_str(row[41])  # לקוח טלפון
        address = clean_str(row[42])  # לקוח כתובת
        city = clean_str(row[43])  # לקוח עיר
        family_status = clean_str(row[18])  # מצב מספחתי
        children = parse_number(row[19])  # ילדים מתחת ל-18
        health_fund = clean_str(row[20])  # קופת חולים
        health_fund_branch = clean_str(row[21])  # סניף קופת חולים
        life_insurance = clean_str(row[22])  # ביטוח חיים

        key = name.strip()
        if key not in clients_map:
            clients_map[key] = {
                "company_id": COMPANY_ID,
                "name": name,
                "id_number": id_number,
                "email": email,
                "phone": phone,
                "secondary_phone": secondary_phone,
                "address": address,
                "city": city,
                "family_status": family_status,
                "children_under_18": int(children) if children else None,
                "health_fund": health_fund,
                "health_fund_branch": health_fund_branch,
                "life_insurance": life_insurance,
                "status": "active",
            }
        else:
            # Merge: fill in missing fields
            existing = clients_map[key]
            for field, val in [
                ("id_number", id_number), ("email", email), ("phone", phone),
                ("secondary_phone", secondary_phone), ("address", address),
                ("city", city), ("family_status", family_status),
                ("health_fund", health_fund), ("health_fund_branch", health_fund_branch),
                ("life_insurance", life_insurance),
            ]:
                if val and not existing.get(field):
                    existing[field] = val
            if children and not existing.get("children_under_18"):
                existing["children_under_18"] = int(children)

    print(f"Unique clients: {len(clients_map)}")

    # Insert clients and get back IDs
    client_records = list(clients_map.values())

    # Remove None values
    for rec in client_records:
        for k in list(rec.keys()):
            if rec[k] is None:
                del rec[k]

    print("Inserting clients...")
    url = f"{SUPABASE_URL}/rest/v1/clients"
    headers = dict(HEADERS)
    headers["Prefer"] = "return=representation"

    # Insert in batches and collect IDs
    client_name_to_id = {}
    batch_size = 500
    for i in range(0, len(client_records), batch_size):
        batch = client_records[i:i+batch_size]
        r = requests.post(url, headers=headers, json=batch)
        if r.status_code in (200, 201):
            results = r.json()
            for rec in results:
                client_name_to_id[rec["name"]] = rec["id"]
            print(f"  Inserted clients {i+1}-{i+len(batch)} ({len(results)} returned)")
        else:
            print(f"  Error: {r.status_code} {r.text[:500]}")
            # Try one by one for this batch
            for rec in batch:
                r2 = requests.post(url, headers=headers, json=rec)
                if r2.status_code in (200, 201):
                    res = r2.json()
                    if isinstance(res, list) and res:
                        client_name_to_id[res[0]["name"]] = res[0]["id"]
                    elif isinstance(res, dict):
                        client_name_to_id[res["name"]] = res["id"]
                else:
                    print(f"    Failed: {rec.get('name','?')}: {r2.status_code} {r2.text[:200]}")

    print(f"Clients inserted: {len(client_name_to_id)}")

    # Phase 2: Build and insert cases
    print("\n--- Phase 2: Building cases ---")
    cases = []
    seen_ids = set()

    for row in rows:
        raw_client = row[0]
        case_number = clean_str(row[1])

        if not raw_client or raw_client.strip() in SKIP_CLIENTS:
            continue
        if not case_number:
            continue

        name, _ = parse_client_name(raw_client)
        if not name:
            continue

        # Generate unique case ID
        case_id = f"{COMPANY_ID[:8]}-{case_number}"
        if case_id in seen_ids:
            # Make unique with counter
            counter = 2
            while f"{case_id}-{counter}" in seen_ids:
                counter += 1
            case_id = f"{case_id}-{counter}"
        seen_ids.add(case_id)

        client_id = client_name_to_id.get(name.strip())

        title = clean_str(row[16]) or f"תיק {case_number}"  # שם תיק
        case_type = clean_str(row[2])  # סוג תביעה
        status = clean_str(row[13])  # סטטוס

        case = {
            "id": case_id,
            "company_id": COMPANY_ID,
            "title": title,
            "client": name,
            "case_number": case_number,
            "case_type": case_type,
            "status": status or "פעיל",
            "description": clean_str(row[4]),  # תאור תביעה
            "claim_date": parse_date(row[3]),  # ת. תביעה
            "insurance_case_number": clean_str(row[5]),
            "insurance_handler": clean_str(row[6]),
            "event_date": parse_date(row[7]),
            "opening_date": parse_date(row[8]),
            "civil_case_number": clean_str(row[9]),
            "court": clean_str(row[10]),
            "judge": clean_str(row[11]),
            "assigned_to": clean_str(row[12]),
            "detailed_status": clean_str(row[14]),
            "classification": clean_str(row[15]),
            "opposing_party": clean_str(row[17]),
            "vehicle_number": clean_str(row[23]),
            "policy_number": clean_str(row[24]),
            "mandatory_insurer": clean_str(row[25]),
            "driver_name": clean_str(row[26]),
            "driver_id_number": clean_str(row[27]),
            "third_party_vehicle": clean_str(row[28]),
            "third_party_policy": clean_str(row[29]),
            "third_party_insurer": clean_str(row[30]),
            "third_party_driver": clean_str(row[31]),
            "third_party_driver_id": clean_str(row[32]),
            "estimated_fee": parse_number(row[33]),
            "fee_estimation_date": parse_date(row[34]),
            "serial_number": clean_str(row[35]),
            "last_hearing_date": parse_date(row[36]),
            "valuation": parse_number(row[37]),
            "claim_amount": parse_number(row[45]),
            "real_damage_amount": parse_number(row[46]),
            "final_payment": parse_number(row[47]),
            "agreed_fee": parse_number(row[48]),
            "risk_rate": parse_number(row[49]),
        }

        if client_id:
            case["client_id"] = client_id

        # Remove None values
        case = {k: v for k, v in case.items() if v is not None}
        cases.append(case)

    print(f"Total cases to insert: {len(cases)}")

    # Insert cases in batches
    print("Inserting cases...")
    url = f"{SUPABASE_URL}/rest/v1/cases"
    headers = dict(HEADERS)
    headers["Prefer"] = "return=minimal"

    inserted = 0
    errors = 0
    for i in range(0, len(cases), batch_size):
        batch = cases[i:i+batch_size]
        r = requests.post(url, headers=headers, json=batch)
        if r.status_code in (200, 201):
            inserted += len(batch)
            print(f"  Inserted {inserted}/{len(cases)}")
        else:
            print(f"  Batch error {i}-{i+len(batch)}: {r.status_code} {r.text[:300]}")
            # Try one by one
            for case in batch:
                r2 = requests.post(url, headers=headers, json=case)
                if r2.status_code in (200, 201):
                    inserted += 1
                else:
                    errors += 1
                    if errors <= 10:
                        print(f"    Failed case {case.get('id','?')}: {r2.status_code} {r2.text[:200]}")
            print(f"  After retry: {inserted} inserted, {errors} errors")

    print(f"\n=== DONE ===")
    print(f"Clients inserted: {len(client_name_to_id)}")
    print(f"Cases inserted: {inserted}")
    print(f"Cases errors: {errors}")


if __name__ == "__main__":
    main()
