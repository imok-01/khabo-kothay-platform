# KHABO KOTHAY — DATABASE CONTEXT README

## Purpose

This file provides context for Freebuff before frontend architecture preparation work.

The approved Khabo Kothay Database Foundation v1.1 documents are the source of truth for understanding future backend data structures.

## Reference Files

1. KHABO_KOTHAY_DATABASE_FOUNDATION_v1.1_TECHNICAL_SPECIFICATION.docx

Purpose:
- Understand approved database concepts
- Understand entities and relationships
- Understand future data shapes

2. KHABO_KOTHAY_DATABASE_FOUNDATION_v1.1_FINAL_MIGRATION.sql

Purpose:
- Reference approved SQL structure
- Understand tables, fields, enums, constraints and relationships

## Important Boundaries

The database implementation is handled separately.

DO NOT:
- Modify database schema
- Create new tables
- Rename columns
- Change relationships
- Create migrations
- Create RLS policies
- Import restaurant data
- Make product decisions

## Freebuff Responsibility

Prepare the existing website codebase for future backend connection.

Focus on:

Frontend UI
        ↓
Data Layer
        ↓
Future API/Supabase Integration

The goal is clean separation between:
- UI components
- Pages
- Data fetching logic
- Transformation logic
- Backend integration points

## Implementation Philosophy

Prefer:
- Controlled refactoring
- Existing feature preservation
- Clear architecture boundaries
- Minimal unnecessary changes

Do not rebuild working systems without evidence.

## Final Goal

When Supabase integration begins later:

Frontend should connect cleanly to the approved Khabo Kothay backend structure without major architectural rewrites.

Human approval is required before any database or product-level decisions.
