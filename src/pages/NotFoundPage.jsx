import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';
import { useLanguage } from '../i18n/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <div className="card">
      <EmptyState
        title={t('notFound.title')}
        action={
          <Link to="/tickets" className="btn btn-primary">
            {t('notFound.back')}
          </Link>
        }
      />
    </div>
  );
}
