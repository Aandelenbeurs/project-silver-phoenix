import React from 'react';
import type {Metadata} from 'next';
import IntelligenceClient from './IntelligenceClient';
import './intelligence.css';
export const metadata:Metadata={title:'Financial Intelligence | Phoenix Portfolio'};
export default function IntelligencePage(){return <IntelligenceClient />;}
