export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-[#ededed]">Dashboard Overview</h1>
      <p className="mb-8 text-[#afafaf]">
        Welcome to the admin dashboard. Select a section from the left to edit your CV content.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <a
          href="/pt-BR"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 transition-colors hover:border-[#da0037]"
        >
          <h3 className="text-lg font-bold text-[#da0037]">View PT-BR Site</h3>
          <p className="mt-1 text-sm text-[#afafaf]">Open the public site in Portuguese</p>
        </a>
        <a
          href="/en"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 transition-colors hover:border-[#da0037]"
        >
          <h3 className="text-lg font-bold text-[#da0037]">View EN Site</h3>
          <p className="mt-1 text-sm text-[#afafaf]">Open the public site in English</p>
        </a>
        <a
          href="/api/cv?locale=en&format=pdf"
          className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 transition-colors hover:border-[#da0037]"
        >
          <h3 className="text-lg font-bold text-[#da0037]">Download CV PDF</h3>
          <p className="mt-1 text-sm text-[#afafaf]">Generate English PDF from current DB content</p>
        </a>
        <a
          href="/api/cv?locale=pt-BR&format=docx"
          className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 transition-colors hover:border-[#da0037]"
        >
          <h3 className="text-lg font-bold text-[#da0037]">Download CV DOCX</h3>
          <p className="mt-1 text-sm text-[#afafaf]">Generate Portuguese DOCX from current DB content</p>
        </a>
      </div>
    </div>
  );
}
