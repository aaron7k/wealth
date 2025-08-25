"""
File Processor Service - Handle CSV/Excel imports
"""

import pandas as pd
from typing import Dict, List, Any, Optional
import io


class FileProcessor:
    def __init__(self):
        pass
    
    async def auto_detect_columns(self, df: pd.DataFrame) -> 'ImportMapping':
        """Auto-detect column mapping from DataFrame"""
        from schemas.analytics import ImportMapping  # Local import to avoid circular dependency
        
        # Simple heuristic column detection
        columns = df.columns.str.lower()
        
        date_column = None
        description_column = None
        amount_column = None
        
        for col in columns:
            if any(word in col for word in ['date', 'fecha']):
                date_column = col
            elif any(word in col for word in ['description', 'desc', 'descripcion']):
                description_column = col
            elif any(word in col for word in ['amount', 'monto', 'valor']):
                amount_column = col
        
        return {
            "date_column": date_column or df.columns[0],
            "description_column": description_column or df.columns[1] if len(df.columns) > 1 else df.columns[0],
            "amount_column": amount_column or df.columns[-1],
            "currency_column": None,
            "category_column": None,
            "account_column": None
        }
    
    async def process_csv_data(self, df: pd.DataFrame, mapping: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process CSV data into transactions"""
        processed_data = []
        
        for _, row in df.iterrows():
            transaction = {
                "date": str(row.get(mapping["date_column"], "")),
                "description": str(row.get(mapping["description_column"], "")),
                "amount": float(row.get(mapping["amount_column"], 0)),
                "currency": str(row.get(mapping.get("currency_column"), "USD")),
            }
            processed_data.append(transaction)
        
        return processed_data
    
    async def process_excel_data(self, df: pd.DataFrame, mapping: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process Excel data into transactions"""
        return await self.process_csv_data(df, mapping)
    
    def get_sheet_names(self, excel_data: io.BytesIO) -> List[str]:
        """Get sheet names from Excel file"""
        try:
            excel_file = pd.ExcelFile(excel_data)
            return excel_file.sheet_names
        except:
            return ["Sheet1"]
    
    async def get_import_templates(self) -> List[Dict[str, Any]]:
        """Get predefined import templates"""
        return [
            {
                "name": "Banco de México",
                "description": "Formato estándar de exportación",
                "mapping": {
                    "date_column": "Fecha",
                    "description_column": "Descripción",
                    "amount_column": "Monto",
                    "currency_column": "Moneda"
                }
            },
            {
                "name": "BBVA",
                "description": "Exportación de BBVA México",
                "mapping": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",
                    "currency_column": "Currency"
                }
            }
        ]