export interface IMEIVerificationResult {
  Region: string;
  City: string;
  ShopName: string;
  CustomerName: string;
  CompanyName: string;
  ProductName: string;
  ProductCategory: string;
  IMEINo: string;
  InvoiceNo: string;
  InvoiceDate: string;
}

export interface IMEIVerificationLog {
  IMEIVerificationLogId: string;
  PromoterUserId: number;
  PromoterName: string;
  VisitId: number;
  ShopId: number;
  ShopName: string;
  Region: string;
  City: string;
  ScanIMEI: string;
  InvoiceNo: string;
  InvoiceDate: string;
  CustomerName: string;
  ApiCompanyName: string;
  ProductName: string;
  ProductCategory: string;
  Lat: number | null;
  Long: number | null;
  ScanDatetime: string;
  IsDummy: boolean;
}
