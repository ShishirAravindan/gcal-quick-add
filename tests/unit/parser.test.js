import { describe, it, expect, vi } from 'vitest';
import EventParser from '../../src/eventParser.js';

describe('EventParser URL Generation', () => {
    const parser = new EventParser();

    it('should correctly generate web calendar URL', () => {
        const details = {
            text: 'Meeting',
            dates: '20240109T140000/20240109T150000',
            location: 'Office'
        };
        
        const url = parser.createGoogleCalendarUrl(details);
        const params = new URLSearchParams(url.split('?')[1]);
        
        expect(params.get('text')).toBe('Meeting');
        expect(params.get('dates')).toBe('20240109T140000/20240109T150000');
        expect(params.get('location')).toBe('Office');
    });

    it('should include recurrence in URL', () => {
        const details = {
            text: 'Gym',
            dates: '20240109T070000/20240109T080000',
            recur: 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH'
        };
        
        const url = parser.createGoogleCalendarUrl(details);
        const params = new URLSearchParams(url.split('?')[1]);
        expect(params.get('recur')).toBe('RRULE:FREQ=WEEKLY;BYDAY=TU,TH');
    });
});