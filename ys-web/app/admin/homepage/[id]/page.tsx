import { HomepageSectionForm } from '../HomepageSectionForm'

export default async function EditHomepageSection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <HomepageSectionForm sectionId={id} />
}
