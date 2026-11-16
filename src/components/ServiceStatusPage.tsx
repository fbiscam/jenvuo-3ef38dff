import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { Check, CircleHelp, CircleAlert, RefreshCw } from 'lucide-react';
import JenvuMark from './JenvuMark';
import SiteFooter from './SiteFooter';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { getServiceStatus } from '@/lib/service-status.functions';
import { aggregateState, statusDays, STATE_LABEL, STATUS_GROUPS, type ServiceState } from '@/lib/service-status';

export const serviceStatusQuery = queryOptions({ queryKey: ['service-status'], queryFn: () => getServiceStatus(), staleTime: 60_000, refetchInterval: 60_000, refetchIntervalInBackground: false });
function Indicator({ state }: { state: ServiceState }) {
  const Icon = state === 'operational' ? Check : state === 'unknown' ? CircleHelp : CircleAlert;
  return <span className={`status-indicator status-${state}`} title={STATE_LABEL[state]} aria-label={STATE_LABEL[state]}><Icon size={12} aria-hidden /></span>;
}
export default function ServiceStatusPage() {
  const { data, refetch, isFetching } = useSuspenseQuery(serviceStatusQuery);
  const [zone, setZone] = useState('UTC');
  const [updated, setUpdated] = useState(data.checkedAt.replace('T', ' ').slice(0, 16) + ' UTC');
  useEffect(() => {
    const format = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'shortOffset' });
    setZone(format.formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? 'UTC');
    setUpdated(format.format(new Date(data.checkedAt)));
  }, [data.checkedAt]);
  const overall = aggregateState(data.checks.map(c => c.state));
  return <div className="status-page">
    <header className="status-header">
      <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Jenvu home"><JenvuMark className="h-7 w-7" /></Link></Button>
      <span className="status-overview">Overview</span>
      <div className="status-header-tools"><span><span className="status-muted">Time</span> {zone}</span><ThemeToggle /></div>
    </header>
    <main className="status-main">
      <div className="status-heading"><div><h1>Service Status</h1><p>Updated {updated}</p></div><Button variant="outline" size="icon" className="rounded-full" aria-label="Refresh status" title="Refresh status" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={isFetching ? 'animate-spin' : ''} /></Button></div>
      <div className={`status-summary status-${overall}`} role="status"><Indicator state={overall} /><div><h2>{overall === 'operational' ? 'All monitored services operational' : overall === 'unknown' ? 'Some checks could not be verified' : 'Service disruption detected'}</h2><p>{overall === 'operational' ? 'Current availability checks are passing.' : 'See individual services below for the latest availability.'}</p></div></div>
      {STATUS_GROUPS.map(group => {
        const ids = group.services.map(s => s.id);
        const state = aggregateState(ids.map(id => data.checks.find(c => c.id === id)?.state ?? 'unknown'));
        const days = statusDays(data.samples, ids, data.checkedAt);
        return <section key={group.name} className="status-group" aria-label={group.name}>
          <div className="status-group-heading"><h2>{group.name} <span>90 Days</span></h2><span className={`status-badge status-${state}`}>{STATE_LABEL[state]}</span></div>
          <div className="status-bars" aria-label={`${group.name} recorded availability over 90 days`}>{days.map(day => <span key={day.date} tabIndex={0} className={`status-bar status-${day.state}`}><span className="status-bar-tip">{day.date}<br />{day.count ? `${STATE_LABEL[day.state]} · ${day.count} observations` : 'No recorded observations'}</span></span>)}</div>
          <div className="status-history-caption"><span>90 days ago</span><span>Today</span></div>
          <div className="status-services">{group.services.map(service => <div key={service.id} className="status-service"><span>{service.name}</span><Indicator state={data.checks.find(c => c.id === service.id)?.state ?? 'unknown'} /></div>)}</div>
        </section>;
      })}
      <p className="status-method">Live checks refresh every minute. History contains hourly observations, not continuous uptime; grey bars have no verified data. Page access does not verify signed-in workflows, AI replies or broker execution. {data.historyAvailable ? '' : 'Recorded history is currently unavailable.'}</p>
    </main>
    <SiteFooter />
  </div>;
}