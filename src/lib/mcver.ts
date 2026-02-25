export type JavaPackVersion = {
    pack_format: string;
    version: string;
};

const mc_version: JavaPackVersion[] = [
    { "pack_format": "1", "version": "1.6.1-1.8.9" },
    { "pack_format": "2", "version": "1.9-1.10.2" },
    { "pack_format": "3", "version": "1.11-17w47b" },
    { "pack_format": "4", "version": "1.13-19w46b" },
    { "pack_format": "5", "version": "1.15(pre1)-1.16.2-pre3" },
    { "pack_format": "6", "version": "1.16.2(rc1)-1.16.5" },
    { "pack_format": "7", "version": "1.17-21w38a" },
    { "pack_format": "8", "version": "1.18-1.18.2" },
    { "pack_format": "9", "version": "1.19-1.19.2" },

    { "pack_format": "11", "version": "1.19.3-22w44a" },
    { "pack_format": "12", "version": "1.19.3-23w07a" },
    { "pack_format": "13", "version": "1.19.4(pre1)-1.20-23w13a" },
    { "pack_format": "14", "version": "1.20-23w16a" },
    { "pack_format": "15", "version": "1.20-1.20.1" },

    { "pack_format": "16", "version": "1.20.2-23w31a" },
    { "pack_format": "17", "version": "1.20.2-1.20.2(pre1)" },
    { "pack_format": "18", "version": "1.20.2-pre2-23w41a" },
    { "pack_format": "19", "version": "1.20.3-23w42a" },
    { "pack_format": "20", "version": "1.20.3-23w44a" },
    { "pack_format": "21", "version": "1.20.3-23w46a" },
    { "pack_format": "22", "version": "1.20.3(pre1)-23w51b" },

    { "pack_format": "24", "version": "1.20.5-24w04a" },
    { "pack_format": "25", "version": "1.20.5-24w05b" },
    { "pack_format": "26", "version": "1.20.5-24w07a" },
    { "pack_format": "28", "version": "1.20.5-24w10a" },
    { "pack_format": "29", "version": "1.20.5-24w11a" },
    { "pack_format": "30", "version": "1.20.5-24w12a" },
    { "pack_format": "31", "version": "1.20.5-24w13a(pre3)" },
    { "pack_format": "32", "version": "1.20.5(pre4)-1.20.6" },

    { "pack_format": "33", "version": "1.21-24w20a" },
    { "pack_format": "34", "version": "1.21-1.21.1" },

    { "pack_format": "35", "version": "1.21.2-24w33a" },
    { "pack_format": "36", "version": "1.21.2-24w35a" },
    { "pack_format": "37", "version": "1.21.2-24w36a" },
    { "pack_format": "38", "version": "1.21.2-24w37a" },
    { "pack_format": "39", "version": "1.21.2-24w39a" },
    { "pack_format": "40", "version": "1.21.2-24w40a" },
    { "pack_format": "41", "version": "1.21.2(pre1)-1.21.2(pre2)" },
    { "pack_format": "42", "version": "1.21.2(pre3)-1.21.3" },

    { "pack_format": "43", "version": "1.21.4-24w44a" },
    { "pack_format": "44", "version": "1.21.4-24w45a" },
    { "pack_format": "45", "version": "1.21.4-24w46a" },
    { "pack_format": "46", "version": "1.21.4(pre1)-1.21.4" },

    { "pack_format": "47", "version": "1.21.5-25w02a" },
    { "pack_format": "48", "version": "1.21.5-25w03a" },
    { "pack_format": "49", "version": "1.21.5-25w04a" },
    { "pack_format": "50", "version": "1.21.5-25w05a" },
    { "pack_format": "51", "version": "1.21.5-25w06a" },
    { "pack_format": "52", "version": "1.21.5-25w07a" },
    { "pack_format": "53", "version": "1.21.5-25w09b" },
    { "pack_format": "54", "version": "1.21.5-25w10a" },
    { "pack_format": "55", "version": "1.21.5(pre1)-1.21.5" },

    { "pack_format": "56", "version": "1.21.6-25w15a" },
    { "pack_format": "57", "version": "1.21.6-25w16a" },
    { "pack_format": "58", "version": "1.21.6-25w17a" },
    { "pack_format": "59", "version": "1.21.6-25w18a" },
    { "pack_format": "60", "version": "1.21.6-25w19a" },
    { "pack_format": "61", "version": "1.21.6-25w20a" },
    { "pack_format": "62", "version": "1.21.6-25w21a" },
    { "pack_format": "63", "version": "1.21.6(pre1)-1.21.7(rc1)" },
    { "pack_format": "64", "version": "1.21.7(rc2)-1.21.8" },

    { "pack_format": "65.0", "version": "1.21.9-25w31a" },
    { "pack_format": "65.1", "version": "1.21.9-25w32a" },
    { "pack_format": "65.2", "version": "1.21.9-25w33a" },
    { "pack_format": "66.0", "version": "1.21.9-25w34b" },
    { "pack_format": "67.0", "version": "1.21.9-25w35a" },
    { "pack_format": "68.0", "version": "1.21.9-25w36b" },
    { "pack_format": "69.0", "version": "1.21.9-1.21.10" },

    { "pack_format": "70.0", "version": "1.21.11-25w41a" },
    { "pack_format": "70.1", "version": "1.21.11-25w42a" },
    { "pack_format": "71.0", "version": "1.21.11-25w43a" },
    { "pack_format": "72.0", "version": "1.21.11-25w44a" },
    { "pack_format": "73.0", "version": "1.21.11-25w45a" },
    { "pack_format": "74.0", "version": "1.21.11-25w46a" },
    { "pack_format": "75.0", "version": "1.21.11(pre1)-1.21.11" },

    { "pack_format": "76.0", "version": "26.1-snapshot-1" },
    { "pack_format": "77.0", "version": "26.1-snapshot-2" },
    { "pack_format": "78.0", "version": "26.1-snapshot-3" },
    { "pack_format": "78.1", "version": "26.1-snapshot-4" },
    { "pack_format": "79.0", "version": "26.1-snapshot-5" },
    { "pack_format": "80.0", "version": "26.1-snapshot-6" },
    { "pack_format": "81.0", "version": "26.1-snapshot-7" },
    { "pack_format": "81.1", "version": "26.1-snapshot-8" },
    { "pack_format": "81.1", "version": "26.1-snapshot-9" },
    { "pack_format": "82.0", "version": "26.1-snapshot-10" }
]

export default mc_version;
