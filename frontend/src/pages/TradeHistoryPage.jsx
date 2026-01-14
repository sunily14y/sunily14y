import { useEffect, useState } from "react";
import { useTradingStore } from "../store/tradingStore";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format } from "date-fns";

const TradeHistoryPage = () => {
  const { trades, totalTrades, stats, fetchTrades, fetchStats } = useTradingStore();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchTrades(pageSize, page * pageSize);
    fetchStats();
  }, [page, pageSize]);

  const totalPages = Math.ceil(totalTrades / pageSize);

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const exportToCsv = () => {
    const headers = ['Timestamp', 'Symbol', 'Strike', 'Type', 'Action', 'Quantity', 'Price', 'Is Adjustment', 'Reason'];
    const rows = trades.map(trade => [
      trade.timestamp,
      trade.symbol,
      trade.strike,
      trade.position_type,
      trade.action,
      trade.quantity,
      trade.price,
      trade.is_adjustment ? 'Yes' : 'No',
      trade.adjustment_reason || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_history_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade History</h1>
          <p className="text-muted-foreground">
            View all your trades and adjustments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCsv}
            disabled={trades.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</span>
            <div className="font-mono text-2xl font-bold mt-1">{stats.total_trades}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Adjustments</span>
            <div className="font-mono text-2xl font-bold mt-1">{stats.adjustment_count}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Premium Collected</span>
            <div className="font-mono text-2xl font-bold mt-1 text-emerald-500">
              ₹{stats.total_premium_collected?.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Premium Paid</span>
            <div className="font-mono text-2xl font-bold mt-1 text-red-500">
              ₹{stats.total_premium_paid?.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Net Premium</span>
            <div className={cn(
              "font-mono text-2xl font-bold mt-1",
              stats.net_premium >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {stats.net_premium >= 0 ? "+" : ""}₹{stats.net_premium?.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            All Trades ({totalTrades})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-center">Strike</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Adjustment</TableHead>
                  <TableHead className="w-[200px]">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.length > 0 ? (
                  trades.map((trade, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(trade.timestamp), 'dd MMM yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {trade.strike}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs",
                            trade.position_type === 'CE' 
                              ? "text-blue-500 border-blue-500/30" 
                              : "text-amber-500 border-amber-500/30"
                          )}
                        >
                          {trade.position_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs",
                            trade.action === 'SELL' 
                              ? "text-red-500 border-red-500/30" 
                              : "text-emerald-500 border-emerald-500/30"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {trade.action === 'SELL' ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {trade.action}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {trade.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{trade.price?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {trade.is_adjustment && (
                          <Badge variant="secondary" className="text-xs">
                            ADJ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {trade.adjustment_reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No trades found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalTrades > pageSize && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalTrades)} of {totalTrades}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-mono">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeHistoryPage;
