import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractTextFromPdf } from '@/lib/textract-service';

// System prompt for GPT-4o Vision (images)
const VISION_EXTRACTION_PROMPT = `You are a medical bill data extraction expert. Extract all relevant information from this medical bill image and return it as structured JSON.

CRITICAL - PROVIDER CONTACT INFO IS REQUIRED:
1. ALWAYS look for EMAIL ADDRESS - check header area, footer area, and any "Email:" labels
2. ALWAYS look for FAX NUMBER - check header, footer, contact sections
3. ALWAYS look for PHONE NUMBER - usually near provider name or in footer
4. Email addresses typically look like: name@domain.com
5. If you see "Email: xxxxx" anywhere on the bill, extract that email address

These contact fields are essential for automated bill negotiation - do NOT skip them.

Return this exact structure:
{
  "provider": {
    "name": { "value": "Provider Name", "confidence": 95 },
    "npi": { "value": "1234567890", "confidence": 90 },
    "address": { "value": "Full Address", "confidence": 85 },
    "phone": { "value": "(xxx) xxx-xxxx", "confidence": 80 },
    "fax": { "value": "(xxx) xxx-xxxx", "confidence": 75 },
    "email": { "value": "billing@provider.com", "confidence": 70 },
    "tax_id": { "value": "xx-xxxxxxx", "confidence": 85 },
    "billing_department": { "value": "Billing Dept Name if different", "confidence": 60 }
  },
  "member": {
    "name": { "value": "Patient Full Name", "confidence": 95 },
    "id": { "value": "Member ID", "confidence": 90 },
    "dob": { "value": "MM/DD/YYYY", "confidence": 85 },
    "account_number": { "value": "Account #", "confidence": 80 }
  },
  "service": {
    "date_of_service": { "value": "MM/DD/YYYY", "confidence": 90 },
    "place_of_service": { "value": "22 - Outpatient", "confidence": 85 }
  },
  "billing": {
    "total_billed": { "value": 1234.56, "confidence": 95 },
    "adjustments": { "value": 0, "confidence": 80 },
    "amount_due": { "value": 1234.56, "confidence": 90 }
  },
  "diagnosis_codes": [
    { "code": "M17.11", "description": "Primary osteoarthritis, right knee", "confidence": 90 }
  ],
  "line_items": [
    {
      "cpt_code": { "value": "73721", "confidence": 95 },
      "description": { "value": "MRI knee w/o contrast", "confidence": 90 },
      "date": { "value": "MM/DD/YYYY", "confidence": 85 },
      "quantity": { "value": 1, "confidence": 95 },
      "charge": { "value": 1234.56, "confidence": 95 }
    }
  ],
  "document_type": "medical_bill",
  "form_type": "UB04" | "HCFA_1500" | "INVOICE" | "STATEMENT",
  "extraction_notes": "Any relevant notes about data quality or missing fields"
}

Rules:
- Confidence is 0-100 based on how clearly visible/readable the value is
- If a field is not found, omit it or set value to null with confidence 0
- For charges/amounts, extract as numbers (not strings)
- Include ALL line items found on the bill
- Include ALL diagnosis codes found
- If multiple pages, this may be one page of a multi-page document
- ALWAYS include provider.email if ANY email address is visible (check header AND footer)
- ALWAYS include provider.fax if ANY fax number is visible
- ALWAYS include provider.phone if ANY phone number is visible`;

// System prompt for GPT-4 Text (OCR text from PDFs)
const TEXT_EXTRACTION_PROMPT = `You are a medical bill data extraction expert. The following text was extracted via OCR from a medical bill PDF. Extract all relevant information and return it as structured JSON.

CRITICAL - PROVIDER CONTACT INFO IS REQUIRED:
1. ALWAYS look for EMAIL ADDRESS - search for patterns like "Email:" or "@" symbols
2. ALWAYS look for FAX NUMBER - search for "Fax:" or fax number patterns
3. ALWAYS look for PHONE NUMBER - usually near provider info
4. Email addresses look like: name@domain.com (e.g., billing@hospital.com)
5. If you see ANY email address in the text, include it in provider.email

These contact fields are essential for automated bill negotiation - do NOT skip them.

Return this exact structure:
{
  "provider": {
    "name": { "value": "Provider Name", "confidence": 95 },
    "npi": { "value": "1234567890", "confidence": 90 },
    "address": { "value": "Full Address", "confidence": 85 },
    "phone": { "value": "(xxx) xxx-xxxx", "confidence": 80 },
    "fax": { "value": "(xxx) xxx-xxxx", "confidence": 75 },
    "email": { "value": "billing@provider.com", "confidence": 70 },
    "tax_id": { "value": "xx-xxxxxxx", "confidence": 85 },
    "billing_department": { "value": "Billing Dept Name if different", "confidence": 60 }
  },
  "member": {
    "name": { "value": "Patient Full Name", "confidence": 95 },
    "id": { "value": "Member ID", "confidence": 90 },
    "dob": { "value": "MM/DD/YYYY", "confidence": 85 },
    "account_number": { "value": "Account #", "confidence": 80 }
  },
  "service": {
    "date_of_service": { "value": "MM/DD/YYYY", "confidence": 90 },
    "place_of_service": { "value": "22 - Outpatient", "confidence": 85 }
  },
  "billing": {
    "total_billed": { "value": 1234.56, "confidence": 95 },
    "adjustments": { "value": 0, "confidence": 80 },
    "amount_due": { "value": 1234.56, "confidence": 90 }
  },
  "diagnosis_codes": [
    { "code": "M17.11", "description": "Primary osteoarthritis, right knee", "confidence": 90 }
  ],
  "line_items": [
    {
      "cpt_code": { "value": "73721", "confidence": 95 },
      "description": { "value": "MRI knee w/o contrast", "confidence": 90 },
      "date": { "value": "MM/DD/YYYY", "confidence": 85 },
      "quantity": { "value": 1, "confidence": 95 },
      "charge": { "value": 1234.56, "confidence": 95 }
    }
  ],
  "document_type": "medical_bill",
  "form_type": "UB04" | "HCFA_1500" | "INVOICE" | "STATEMENT",
  "extraction_notes": "Any relevant notes about data quality or missing fields"
}

Rules:
- Confidence is 0-100 based on OCR quality and clarity
- If a field is not found in the text, omit it or set value to null with confidence 0
- For charges/amounts, extract as numbers (not strings)
- Include ALL line items found
- Include ALL diagnosis codes found
- Parse dates in various formats and normalize to MM/DD/YYYY
- Handle OCR errors gracefully (e.g., "0" vs "O", "1" vs "l")
- ALWAYS include provider.email if ANY email address is found (look for @ symbols)
- ALWAYS include provider.fax if ANY fax number is found
- ALWAYS include provider.phone if ANY phone number is found`;

/**
 * Extract bill data from image using GPT-4o Vision
 */
async function extractFromImage(imageBase64: string, mimeType: string): Promise<any> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: VISION_EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Extract all data from this medical bill. Return valid JSON only.',
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
    temperature: 0.1,
  });
  
  const content = response.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

/**
 * Extract bill data from OCR text using GPT-4
 */
async function extractFromText(ocrText: string, keyValuePairs: Record<string, string>): Promise<any> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Combine OCR text with key-value pairs for better extraction
  let contextText = ocrText;
  
  if (Object.keys(keyValuePairs).length > 0) {
    contextText += '\n\n--- EXTRACTED KEY-VALUE PAIRS ---\n';
    for (const [key, value] of Object.entries(keyValuePairs)) {
      contextText += `${key}: ${value}\n`;
    }
  }
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // Using gpt-4o for text too (better extraction)
    messages: [
      {
        role: 'system',
        content: TEXT_EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: `Extract all data from this medical bill OCR text. Return valid JSON only.\n\n--- OCR TEXT ---\n${contextText}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
    temperature: 0.1,
  });
  
  const content = response.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

/**
 * Process image files - direct to GPT-4o Vision
 */
async function processImageFile(buffer: Buffer, mimeType: string): Promise<any> {
  console.log('[Extract] Processing image with GPT-4o Vision');
  const base64 = buffer.toString('base64');
  return await extractFromImage(base64, mimeType);
}

/**
 * Process PDF files - Textract OCR → GPT-4 Text
 */
async function processPdfFile(buffer: Buffer, filename: string): Promise<any> {
  console.log('[Extract] Processing PDF with Textract → GPT-4');
  
  // Check for required AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured. Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to environment variables.');
  }
  
  // Check for S3 bucket
  const bucket = process.env.TEXTRACT_S3_BUCKET || process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3 bucket not configured. Please add TEXTRACT_S3_BUCKET or S3_BUCKET to environment variables.');
  }
  
  // Extract text using Textract
  const { text, keyValuePairs, tables } = await extractTextFromPdf(buffer, filename);
  
  if (!text || text.length < 50) {
    throw new Error('Textract did not extract enough text from the PDF. The file may be image-only or corrupted.');
  }
  
  // Add table data to context if present
  let enhancedText = text;
  if (tables.length > 0) {
    enhancedText += '\n\n--- TABLE DATA ---\n';
    for (const row of tables) {
      enhancedText += row.join(' | ') + '\n';
    }
  }
  
  // Send to GPT-4 for structured extraction
  return await extractFromText(enhancedText, keyValuePairs);
}

export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', code: 'NO_API_KEY' },
        { status: 500 }
      );
    }
    
    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded', code: 'NO_FILE' },
        { status: 400 }
      );
    }
    
    // Check file type
    const mimeType = file.type.toLowerCase();
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const supportedTypes = [...supportedImageTypes, 'application/pdf'];
    
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Supported: JPEG, PNG, GIF, WebP, PDF`, code: 'UNSUPPORTED_TYPE' },
        { status: 400 }
      );
    }
    
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[Extract] Processing ${file.name} (${mimeType}, ${buffer.length} bytes)`);
    
    let extractedData: any;
    let extractionMethod: string;
    
    // Process based on file type
    if (mimeType === 'application/pdf') {
      extractedData = await processPdfFile(buffer, file.name);
      extractionMethod = 'textract_gpt4';
    } else {
      extractedData = await processImageFile(buffer, mimeType);
      extractionMethod = 'gpt4o_vision';
    }
    
    // Add metadata
    extractedData._meta = {
      filename: file.name,
      fileType: mimeType,
      fileSize: buffer.length,
      extractedAt: new Date().toISOString(),
      method: extractionMethod,
    };
    
    return NextResponse.json({
      success: true,
      data: extractedData,
    });
    
  } catch (error: any) {
    console.error('[Extract] Error:', error);
    
    // Provide helpful error messages
    let userMessage = error.message || 'Extraction failed';
    let code = 'EXTRACTION_ERROR';
    
    if (error.message?.includes('S3') || error.message?.includes('bucket')) {
      code = 'S3_ERROR';
      userMessage = 'S3 bucket not configured for PDF processing. Please contact support or upload as an image.';
    } else if (error.message?.includes('Textract')) {
      code = 'TEXTRACT_ERROR';
    } else if (error.message?.includes('AWS')) {
      code = 'AWS_ERROR';
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status and requirements
export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAWS = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const hasS3 = !!(process.env.TEXTRACT_S3_BUCKET || process.env.S3_BUCKET);
  
  return NextResponse.json({
    status: hasOpenAI ? 'ready' : 'missing_api_key',
    capabilities: {
      images: hasOpenAI,
      pdfs: hasOpenAI && hasAWS && hasS3,
    },
    configuration: {
      openai: hasOpenAI,
      aws: hasAWS,
      s3Bucket: hasS3,
    },
    supportedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: hasS3 ? ['application/pdf'] : [],
    },
    notes: !hasS3 
      ? 'PDF processing requires S3 bucket configuration. For now, upload bills as JPEG/PNG images.'
      : 'Full PDF and image support available',
  });
}
