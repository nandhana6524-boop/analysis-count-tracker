import pandas as pd
import json
import os

file_path = "Monthly analysed sample count -2022-2026.xlsx"

def clean_value(val):
    if pd.isna(val):
        return None
    return val

try:
    xl = pd.ExcelFile(file_path)
    data = {}
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        records = df.to_dict(orient='records')
        # Deep clean records to remove NaN
        clean_records = []
        for rec in records:
            clean_rec = {str(k): (None if pd.isna(v) else v) for k, v in rec.items()}
            clean_records.append(clean_rec)
        data[sheet_name] = clean_records

    # Extract historical year totals from the TOTAL COUNT sheet
    # and store as a simple year -> count mapping
    historical_years = {}
    if 'TOTAL COUNT' in data:
        rows = data['TOTAL COUNT']
        years_row = next((r for r in rows if r.get('Unnamed: 0') == 'YEAR'), None)
        counts_row = next((r for r in rows if r.get('Unnamed: 0') == 'COUNT'), None)
        if years_row and counts_row:
            for key in years_row:
                if key == 'Unnamed: 0':
                    continue
                yr_val = years_row[key]
                cnt_val = counts_row.get(key)
                if yr_val is not None and cnt_val is not None:
                    yr_str = str(int(yr_val))
                    historical_years[yr_str] = int(cnt_val)
    
    data['HISTORICAL_YEARS'] = historical_years

    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Data extracted to data.json")
    print(f"Historical years extracted: {historical_years}")
except Exception as e:
    print(f"Error: {e}")
