export const calculateAge = (dob: string | Date): number => {
    if (!dob) return 0;

    let birthDate: Date;
    
    if (dob instanceof Date) {
        birthDate = dob;
    } else {
        // Handle DD-MM-YYYY or DD/MM/YYYY
        const ddmmyyyyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
        const match = dob.trim().match(ddmmyyyyRegex);
        if (match) {
            const [, day, month, year] = match;
            birthDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        } else {
            birthDate = new Date(dob);
        }
    }

    if (isNaN(birthDate.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

/**
 * Format date to YYYY-MM-DD
 * @param date - Date object
 * @returns Formatted date string
 */
export const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
