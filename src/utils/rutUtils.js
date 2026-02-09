export const formatRut = (rut) => {
    if (!rut) return ''

    // Remove any non-alphanumeric character
    let value = rut.replace(/[^0-9kK]/g, '')

    // Return empty if nothing remains
    if (value.length === 0) return ''

    // Split body and dv
    const body = value.slice(0, -1)
    const dv = value.slice(-1).toUpperCase()

    if (body.length === 0) return value // Just one char typed

    // Format body with dots
    let formattedBody = ''
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
        if (j > 0 && j % 3 === 0) {
            formattedBody = '.' + formattedBody
        }
        formattedBody = body[i] + formattedBody
    }

    return `${formattedBody}-${dv}`
}

export const cleanRut = (rut) => {
    if (!rut) return ''
    return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

export const validateRut = (rut) => {
    if (!rut) return false;
    let value = rut.replace(/\./g, '').replace(/-/g, '');
    if (value.length < 2) return false;

    let body = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();

    let suma = 0;
    let multiplo = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(body.charAt(i));
        multiplo = (multiplo < 7) ? multiplo + 1 : 2;
    }

    let expectedDv = 11 - (suma % 11);

    if (expectedDv === 11) expectedDv = '0';
    else if (expectedDv === 10) expectedDv = 'K';
    else expectedDv = expectedDv.toString();

    return dv === expectedDv;
}
