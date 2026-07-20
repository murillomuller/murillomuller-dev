import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
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

const GREEN = '#38761d';
const BLUE = '#1155cc';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.35,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  headerLeft: {
    width: '28%',
    paddingRight: 8,
  },
  headerCenter: {
    width: '44%',
    alignItems: 'center',
  },
  headerRight: {
    width: '28%',
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  headerMeta: {
    fontSize: 9,
    color: '#222222',
    marginBottom: 2,
  },
  headerLink: {
    fontSize: 9,
    color: BLUE,
    textDecoration: 'underline',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    marginTop: 8,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: GREEN,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  jobRole: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 8,
  },
  jobRight: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    maxWidth: '55%',
  },
  companyLink: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textDecoration: 'underline',
  },
  companyPlain: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  jobDates: {
    fontSize: 10,
    marginLeft: 10,
  },
  jobSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  teamLink: {
    fontSize: 9.5,
    color: BLUE,
    textDecoration: 'underline',
  },
  teamPlain: {
    fontSize: 9.5,
    color: BLUE,
  },
  location: {
    fontSize: 9.5,
    color: '#000000',
  },
  bulletRow: {
    flexDirection: 'row',
    marginTop: 1.5,
    paddingLeft: 2,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
  },
  skillsLine: {
    fontSize: 9.5,
    marginTop: 2,
    marginLeft: 12,
  },
  skillsLabel: {
    fontFamily: 'Helvetica-Bold',
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  compactLeft: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    paddingRight: 8,
  },
  eduRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  eduText: {
    flex: 1,
    fontSize: 9.5,
    paddingRight: 8,
  },
  eduDates: {
    fontSize: 9.5,
  },
});

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ExperienceBlock({
  exp,
  locale,
  labels,
}: {
  exp: CvExperience;
  locale: string;
  labels: CvLabels;
}) {
  const url = companyUrl(exp.company);
  const team = teamLabel(exp.company, locale, exp.role);
  const bullets = toBullets(exp.description);
  const skills = jobSkills(exp.company, exp.role);
  const dates = dateRange(exp.startDate, exp.endDate, labels.present);
  const location = jobLocation(exp.company, locale);

  if (isCompactRole(exp)) {
    return (
      <View style={styles.compactRow} wrap={false}>
        <View style={styles.compactLeft}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>{exp.role}</Text>
          <Text style={{ fontSize: 10 }}> </Text>
          {url ? (
            <Link src={url} style={styles.companyLink}>
              {exp.company}
            </Link>
          ) : (
            <Text style={styles.companyPlain}>{exp.company}</Text>
          )}
        </View>
        <Text style={styles.jobDates}>{dates}</Text>
      </View>
    );
  }

  return (
    <View wrap={false}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobRole}>{exp.role}</Text>
        <View style={styles.jobRight}>
          {url ? (
            <Link src={url} style={styles.companyLink}>
              {exp.company}
            </Link>
          ) : (
            <Text style={styles.companyPlain}>{exp.company}</Text>
          )}
          <Text style={styles.jobDates}>{dates}</Text>
        </View>
      </View>
      <View style={styles.jobSub}>
        {url ? (
          <Link src={url} style={styles.teamLink}>
            {team}
          </Link>
        ) : (
          <Text style={styles.teamPlain}>{team}</Text>
        )}
        <Text style={styles.location}>{location}</Text>
      </View>
      {bullets.map((b, i) => (
        <View key={`${exp.id}-b-${i}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}
      {skills.length > 0 && (
        <Text style={styles.skillsLine}>
          <Text style={styles.skillsLabel}>{labels.skills}: </Text>
          {skills.join(', ')}
        </Text>
      )}
    </View>
  );
}

export function VerasResumePdf({
  profile,
  experience,
  education,
  languages,
  labels,
  locale,
}: {
  profile: CvProfile;
  experience: CvExperience[];
  education: CvEducation[];
  languages: CvLanguage[];
  labels: CvLabels;
  locale: string;
}) {
  const linkedin = displayLink(profile.linkedinUrl);
  const github = displayLink(profile.githubUrl);

  return (
    <Document
      title={`${profile.name} Resume`}
      author={profile.name}
      subject="Curriculum Vitae"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerMeta}>{labels.location}</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.name}>{profile.name}</Text>
          </View>
          <View style={styles.headerRight}>
            {profile.linkedinUrl && (
              <Link src={profile.linkedinUrl} style={styles.headerLink}>
                {linkedin}
              </Link>
            )}
            {profile.githubUrl && (
              <Link src={profile.githubUrl} style={styles.headerLink}>
                {github}
              </Link>
            )}
          </View>
        </View>

        <SectionTitle title={labels.experience} />
        {experience.map((exp) => (
          <ExperienceBlock key={exp.id} exp={exp} locale={locale} labels={labels} />
        ))}

        <SectionTitle title={labels.education} />
        {education.map((edu) => (
          <View key={edu.id} style={styles.eduRow} wrap={false}>
            <Text style={styles.eduText}>
              • {edu.degree} — {edu.institution}
            </Text>
            <Text style={styles.eduDates}>
              {dateRange(edu.startDate, edu.endDate, labels.present)}
            </Text>
          </View>
        ))}

        {languages.length > 0 && (
          <>
            <SectionTitle title={labels.languages} />
            {languages.map((lang) => (
              <View key={lang.id} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  {lang.name}: {lang.level}
                </Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
