import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TabStopType,
  UnderlineType,
  WidthType,
} from 'docx';
import {
  CvEducation,
  CvExperience,
  CvLabels,
  CvLanguage,
  CvProfile,
  companyUrl,
  dateRange,
  displayLink,
  isCompactRole,
  jobLocation,
  jobSkills,
  teamLabel,
  toBullets,
} from './format';

const GREEN = '38761D';
const BLUE = '1155CC';
const PAGE_WIDTH = 9360; // DXA ~6.5" content width for letter/A4 with margins

function linkRun(text: string, url: string, opts?: { bold?: boolean; size?: number }) {
  return new ExternalHyperlink({
    link: url,
    children: [
      new TextRun({
        text,
        color: BLUE,
        underline: { type: UnderlineType.SINGLE },
        bold: opts?.bold,
        size: opts?.size ?? 20,
        font: 'Calibri',
      }),
    ],
  });
}

function textRun(
  text: string,
  opts?: { bold?: boolean; color?: string; size?: number; italics?: boolean }
) {
  return new TextRun({
    text,
    bold: opts?.bold,
    color: opts?.color,
    size: opts?.size ?? 20,
    italics: opts?.italics,
    font: 'Calibri',
  });
}

function sectionTitle(title: string) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 },
    },
    children: [textRun(title, { bold: true, color: GREEN, size: 26 })],
  });
}

function headerTable(profile: CvProfile, labels: CvLabels) {
  const linkedin = displayLink(profile.linkedinUrl);
  const github = displayLink(profile.githubUrl);

  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [2600, 4160, 2600],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                children: [textRun(labels.location, { size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4160, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [textRun(profile.name, { bold: true, size: 32 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              ...(profile.linkedinUrl
                ? [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [linkRun(linkedin, profile.linkedinUrl, { size: 18 })],
                    }),
                  ]
                : []),
              ...(profile.githubUrl
                ? [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [linkRun(github, profile.githubUrl, { size: 18 })],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });
}

function experienceBlocks(
  experience: CvExperience[],
  locale: string,
  labels: CvLabels
): Paragraph[] {
  const out: Paragraph[] = [];

  for (const exp of experience) {
    const url = companyUrl(exp.company);
    const team = teamLabel(exp.company, locale, exp.role);
    const dates = dateRange(exp.startDate, exp.endDate, labels.present);
    const bullets = toBullets(exp.description);
    const skills = jobSkills(exp.company, exp.role);
    const location = jobLocation(exp.company, locale);

    if (isCompactRole(exp)) {
      out.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            textRun(exp.role, { bold: true }),
            textRun('  '),
            ...(url
              ? [linkRun(exp.company, url, { bold: true })]
              : [textRun(exp.company, { bold: true, color: BLUE })]),
            textRun(`\t${dates}`),
          ],
        })
      );
      continue;
    }

    out.push(
      new Paragraph({
        spacing: { before: 120, after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH }],
        children: [
          textRun(exp.role, { bold: true, size: 21 }),
          textRun('\t'),
          ...(url
            ? [linkRun(exp.company, url, { bold: true, size: 21 })]
            : [textRun(exp.company, { bold: true, color: BLUE, size: 21 })]),
          textRun(`  ${dates}`, { size: 20 }),
        ],
      })
    );

    out.push(
      new Paragraph({
        spacing: { before: 20, after: 40 },
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH }],
        children: [
          ...(url
            ? [linkRun(team, url, { size: 19 })]
            : [textRun(team, { color: BLUE, size: 19 })]),
          textRun(`\t${location}`, { size: 19 }),
        ],
      })
    );

    for (const bullet of bullets) {
      out.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          indent: { left: 180 },
          children: [textRun(`• ${bullet}`, { size: 19 })],
        })
      );
    }

    if (skills.length > 0) {
      out.push(
        new Paragraph({
          spacing: { before: 20, after: 40 },
          indent: { left: 180 },
          children: [
            textRun(`${labels.skills}: `, { bold: true, size: 19 }),
            textRun(skills.join(', '), { size: 19 }),
          ],
        })
      );
    }
  }

  return out;
}

export async function buildVerasDocx(options: {
  profile: CvProfile;
  experience: CvExperience[];
  education: CvEducation[];
  languages: CvLanguage[];
  labels: CvLabels;
  locale: string;
}): Promise<Buffer> {
  const { profile, experience, education, languages, labels, locale } = options;

  const children = [
    headerTable(profile, labels),
    new Paragraph({ children: [] }),
    sectionTitle(labels.experience),
    ...experienceBlocks(experience, locale, labels),
    sectionTitle(labels.education),
    ...education.map(
      (edu) =>
        new Paragraph({
          spacing: { before: 60, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH }],
          children: [
            textRun(`• ${edu.degree} — ${edu.institution}`, { size: 19 }),
            textRun(`\t${dateRange(edu.startDate, edu.endDate, labels.present)}`, {
              size: 19,
            }),
          ],
        })
    ),
    ...(languages.length
      ? [
          sectionTitle(labels.languages),
          ...languages.map(
            (lang) =>
              new Paragraph({
                spacing: { before: 40, after: 20 },
                children: [textRun(`• ${lang.name}: ${lang.level}`, { size: 19 })],
              })
          ),
        ]
      : []),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 540, bottom: 540, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
