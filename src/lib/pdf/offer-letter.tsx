/**
 * Sirkl Branded PDF Offer Letter Generator
 * Generates professional negotiation offer PDFs
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register fonts (using built-in Helvetica for now)
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#333',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 3,
    borderBottomColor: '#1e40af',
    paddingBottom: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 140,
    color: '#64748b',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 8,
    fontSize: 10,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  col1: { width: '15%' },
  col2: { width: '45%' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  offerBox: {
    backgroundColor: '#1e40af',
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  offerTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  offerAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  offerSubtext: {
    color: '#93c5fd',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },
  savingsBox: {
    backgroundColor: '#dcfce7',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  savingsText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  terms: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
  },
  responseSection: {
    marginTop: 20,
    padding: 15,
    borderWidth: 2,
    borderColor: '#1e40af',
    borderRadius: 8,
  },
  responseTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  responseText: {
    fontSize: 10,
    marginBottom: 5,
  },
  link: {
    color: '#1e40af',
    textDecoration: 'underline',
  },
});

export interface OfferLetterProps {
  // Provider info
  providerName: string;
  providerAddress?: string;
  providerNPI?: string;
  providerTaxId?: string;
  
  // Patient info
  patientName: string;
  patientMemberId: string;
  patientDOB?: string;
  accountNumber?: string;
  
  // Service info
  dateOfService: string;
  
  // Line items
  lineItems: Array<{
    cptCode: string;
    description: string;
    billedAmount: number;
    fairPrice: number;
  }>;
  
  // Totals
  totalBilled: number;
  offerAmount: number;
  maxAcceptable: number;
  potentialSavings: number;
  
  // Offer details
  offerNumber: string;
  offerDate: string;
  expirationDate: string;
  responseUrl: string;
  
  // Client info
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
}

export function OfferLetterPDF(props: OfferLetterProps) {
  const savingsPercent = ((props.potentialSavings / props.totalBilled) * 100).toFixed(0);
  
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SIRKL</Text>
          <Text style={styles.tagline}>HEALTHCARE PAYMENT SOLUTIONS</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Settlement Offer</Text>

        {/* Reference Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Offer Number:</Text>
            <Text style={styles.value}>{props.offerNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Offer Date:</Text>
            <Text style={styles.value}>{props.offerDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Valid Until:</Text>
            <Text style={styles.value}>{props.expirationDate}</Text>
          </View>
        </View>

        {/* Provider Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Provider:</Text>
            <Text style={styles.value}>{props.providerName}</Text>
          </View>
          {props.providerNPI && (
            <View style={styles.row}>
              <Text style={styles.label}>NPI:</Text>
              <Text style={styles.value}>{props.providerNPI}</Text>
            </View>
          )}
          {props.providerTaxId && (
            <View style={styles.row}>
              <Text style={styles.label}>Tax ID:</Text>
              <Text style={styles.value}>{props.providerTaxId}</Text>
            </View>
          )}
        </View>

        {/* Patient Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>{props.patientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Member ID:</Text>
            <Text style={styles.value}>{props.patientMemberId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Service:</Text>
            <Text style={styles.value}>{props.dateOfService}</Text>
          </View>
          {props.accountNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Account #:</Text>
              <Text style={styles.value}>{props.accountNumber}</Text>
            </View>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>CPT</Text>
            <Text style={styles.col2}>Description</Text>
            <Text style={styles.col3}>Billed</Text>
            <Text style={styles.col4}>Offer</Text>
          </View>
          {props.lineItems.map((item, idx) => (
            <View 
              key={idx} 
              style={idx % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={styles.col1}>{item.cptCode}</Text>
              <Text style={styles.col2}>{item.description}</Text>
              <Text style={styles.col3}>${item.billedAmount.toLocaleString()}</Text>
              <Text style={styles.col4}>${item.fairPrice.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Offer Box */}
        <View style={styles.offerBox}>
          <Text style={styles.offerTitle}>SETTLEMENT OFFER AMOUNT</Text>
          <Text style={styles.offerAmount}>
            ${props.offerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.offerSubtext}>
            Original Billed: ${props.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Savings Box */}
        <View style={styles.savingsBox}>
          <Text style={styles.savingsText}>
            💰 Accepting this offer saves ${props.potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({savingsPercent}% reduction)
          </Text>
        </View>

        {/* Response Section */}
        <View style={styles.responseSection}>
          <Text style={styles.responseTitle}>How to Respond</Text>
          <Text style={styles.responseText}>
            To accept or counter this offer, please visit:
          </Text>
          <Text style={[styles.responseText, styles.link]}>
            {props.responseUrl}
          </Text>
          <Text style={styles.responseText}>
            Or contact {props.clientName}: {props.clientPhone || props.clientEmail}
          </Text>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            This offer is valid until {props.expirationDate}. Payment will be processed within 
            15 business days of acceptance. This settlement constitutes payment in full for 
            the referenced services. Provider agrees to not balance bill the patient for any 
            remaining amount. This offer is made on behalf of {props.clientName} and is 
            subject to their standard payment terms.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Sirkl Healthcare Payment Solutions | sirkl.ai
          </Text>
          <Text style={styles.footerText}>
            Questions? Contact {props.clientEmail || 'support@sirkl.ai'}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default OfferLetterPDF;
