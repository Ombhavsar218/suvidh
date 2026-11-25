import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { generateId } from '../utils/formatters';
import { useApp } from './AppContext';
import { initialStockReservations } from '../data/reservationsData';

const ErpDataContext = createContext(null);

export function ErpDataProvider({ children }) {
  const { addToast, currentUser } = useApp();
  const [state, setState] = useState(() => {
    const loaded = storageService.loadState();
    if (!loaded.stockReservations || !Array.isArray(loaded.stockReservations) || loaded.stockReservations.length === 0) {
      loaded.stockReservations = initialStockReservations;
    }
    return loaded;
  });

  useEffect(() => {
    storageService.saveState(state);
  }, [state]);

  const nowStamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const todayDate = () => new Date().toISOString().slice(0, 10);

  // --- Customers ---
  const saveCustomer = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.customers.some((c) => c.id === payload.id);
        const customers = exists
          ? prev.customers.map((c) => (c.id === payload.id ? { ...c, ...payload } : c))
          : [
              {
                ...payload,
                id: generateId('CUST', prev.customers),
                createdAt: todayDate(),
                associatedProductIds: payload.associatedProductIds || [],
              },
              ...prev.customers,
            ];
        return { ...prev, customers };
      });
      addToast({
        title: payload.id ? 'Customer Updated (Local Demo)' : 'Customer Created (Local Demo)',
        message: `${payload.name} saved to LocalStorage.`,
      });
    },
    [addToast]
  );

  const toggleCustomerStatus = useCallback(
    (customerId) => {
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId
            ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' }
            : c
        ),
      }));
      addToast({ title: 'Customer Status Updated', message: 'Saved locally.' });
    },
    [addToast]
  );

  const deleteCustomer = useCallback(
    (customerId) => {
      setState((prev) => {
        const target = prev.customers.find((c) => c.id === customerId);
        const name = target?.name || 'Customer';
        return {
          ...prev,
          customers: prev.customers.filter((c) => c.id !== customerId),
        };
      });
      addToast({
        title: 'Customer Deleted',
        message: 'Customer was removed from LocalStorage.',
        type: 'info',
      });
    },
    [addToast]
  );

  const importCustomersBatch = useCallback(
    (newCustomers) => {
      setState((prev) => ({
        ...prev,
        customers: [...newCustomers, ...prev.customers],
      }));
      addToast({
        title: 'Customers Imported',
        message: `${newCustomers.length} customer records loaded.`,
        type: 'success',
      });
    },
    [addToast]
  );

  // --- Products ---
  const saveProduct = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.products.some((p) => p.id === payload.id);
        const products = exists
          ? prev.products.map((p) => (p.id === payload.id ? { ...p, ...payload } : p))
          : [
              {
                ...payload,
                id: generateId('PROD', prev.products),
              },
              ...prev.products,
            ];
        return { ...prev, products };
      });
      addToast({
        title: payload.id ? 'Product Updated (Local Demo)' : 'Product Added (Local Demo)',
        message: `${payload.name} saved locally.`,
      });
    },
    [addToast]
  );

  const toggleProductStatus = useCallback(
    (productId) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' }
            : p
        ),
      }));
      addToast({ title: 'Product Status Updated', message: 'Saved locally.' });
    },
    [addToast]
  );

  const deleteProduct = useCallback(
    (productId) => {
      setState((prev) => {
        const target = prev.products.find((p) => p.id === productId);
        const name = target?.name || 'Product';
        return {
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        };
      });
      addToast({
        title: 'Product Deleted',
        message: 'Product was removed from LocalStorage.',
        type: 'info',
      });
    },
    [addToast]
  );

  // --- BOMs ---
  const saveBom = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.boms.some((b) => b.id === payload.id);
        const boms = exists
          ? prev.boms.map((b) =>
              b.id === payload.id ? { ...b, ...payload, updatedAt: todayDate() } : b
            )
          : [
              {
                ...payload,
                id: generateId('BOM', prev.boms),
                updatedAt: todayDate(),
              },
              ...prev.boms,
            ];
        return { ...prev, boms };
      });
      addToast({
        title: 'Bill of Materials Saved',
        message: 'BOM components updated in local demo state.',
      });
    },
    [addToast]
  );

  const deleteBom = useCallback(
    (bomId) => {
      setState((prev) => {
        const target = prev.boms.find((b) => b.id === bomId);
        const prod = prev.products.find((p) => p.id === target?.productId);
        const name = prod?.name || target?.id || 'BOM';
        return {
          ...prev,
          boms: prev.boms.filter((b) => b.id !== bomId),
        };
      });
      addToast({
        title: 'BOM Deleted',
        message: 'Bill of Materials was removed from LocalStorage.',
        type: 'info',
      });
    },
    [addToast]
  );

  // --- Suppliers ---
  const saveSupplier = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.suppliers.some((s) => s.id === payload.id);
        const suppliers = exists
          ? prev.suppliers.map((s) => (s.id === payload.id ? { ...s, ...payload } : s))
          : [{ ...payload, id: generateId('SUP', prev.suppliers) }, ...prev.suppliers];
        return { ...prev, suppliers };
      });
      addToast({ title: 'Supplier Saved (Local Demo)', message: `${payload.name} saved.` });
    },
    [addToast]
  );

  const deleteSupplier = useCallback(
    (supplierId) => {
      let isBlocked = false;
      let targetName = 'Supplier';

      setState((prev) => {
        const target = prev.suppliers.find((s) => s.id === supplierId);
        targetName = target?.name || 'Supplier';

        // Check if supplier is referenced by purchase orders
        const isReferencedInPo = prev.purchaseOrders.some((po) => po.supplierId === supplierId);
        // Check if supplier is referenced in material transactions
        const isReferencedInTxn = prev.materialTransactions.some(
          (t) =>
            t.reference &&
            target &&
            (t.reference.includes(target.name) || t.reference.includes(target.code))
        );

        if (isReferencedInPo || isReferencedInTxn) {
          isBlocked = true;
          return prev;
        }

        return {
          ...prev,
          suppliers: prev.suppliers.filter((s) => s.id !== supplierId),
        };
      });

      if (isBlocked) {
        addToast({
          title: 'Cannot Delete Supplier',
          message: `"${targetName}" is referenced by active purchase orders or inventory transactions. Deactivate the vendor instead to preserve audit history.`,
          type: 'danger',
        });
        return false;
      }

      addToast({
        title: 'Supplier Deleted',
        message: `Supplier "${targetName}" was removed from records.`,
        type: 'info',
      });
      return true;
    },
    [addToast]
  );

  // --- Raw Materials & Inventory Transactions ---
  const saveMaterial = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.materials.some((m) => m.id === payload.id);
        const materials = exists
          ? prev.materials.map((m) =>
              m.id === payload.id ? { ...m, ...payload, lastUpdated: nowStamp() } : m
            )
          : [
              {
                ...payload,
                id: generateId('MAT', prev.materials),
                approvedPhysicalQty: Number(payload.approvedPhysicalQty || 0),
                reservedQty: Number(payload.reservedQty || 0),
                pendingInspectionQty: Number(payload.pendingInspectionQty || 0),
                rejectedQty: Number(payload.rejectedQty || 0),
                lastUpdated: nowStamp(),
              },
              ...prev.materials,
            ];
        return { ...prev, materials };
      });
      addToast({ title: 'Material Master Saved', message: `${payload.name} saved locally.` });
    },
    [addToast]
  );

  const deleteMaterial = useCallback(
    (materialId) => {
      let isBlocked = false;
      let targetName = 'Material';

      setState((prev) => {
        const target = prev.materials.find((m) => m.id === materialId);
        targetName = target?.name || 'Material';

        // Check if material is referenced by purchase orders
        const isReferencedInPo = prev.purchaseOrders.some(
          (po) =>
            po.materialId === materialId ||
            po.items?.some((i) => i.materialId === materialId)
        );
        // Check if material is referenced in material transactions
        const isReferencedInTxn = prev.materialTransactions.some(
          (t) => t.materialId === materialId
        );
        // Check if material is referenced in BOMs
        const isReferencedInBom = prev.boms.some((b) =>
          b.items?.some((item) => item.materialId === materialId)
        );
        // Check if material has physical or reserved inventory
        const hasStock =
          (target?.approvedPhysicalQty || 0) > 0 ||
          (target?.reservedQty || 0) > 0;

        if (isReferencedInPo || isReferencedInTxn || isReferencedInBom || hasStock) {
          isBlocked = true;
          return prev;
        }

        return {
          ...prev,
          materials: prev.materials.filter((m) => m.id !== materialId),
        };
      });

      if (isBlocked) {
        addToast({
          title: 'Deletion Blocked',
          message: `Cannot delete "${targetName}" because it is linked to active purchase orders, inventory transactions, or BOM recipes. Please deactivate instead.`,
          type: 'danger',
        });
        return false;
      }

      addToast({
        title: 'Material Deleted',
        message: 'Raw material was removed from master catalog.',
        type: 'info',
      });
      return true;
    },
    [addToast]
  );

  const recordMaterialTransaction = useCallback(
    ({ materialId, type, quantity, reference, remarks, requireQc = true }) => {
      const qty = Number(quantity);
      if (!materialId || Number.isNaN(qty) || qty === 0) return false;

      const currentMat = state.materials.find((m) => m.id === materialId);
      if (!currentMat) return false;

      const currentUsableAvailable = Math.max(
        0,
        currentMat.approvedPhysicalQty - currentMat.reservedQty
      );

      if (type === 'Outward' && Math.abs(qty) > currentMat.approvedPhysicalQty) {
        addToast({
          title: 'Transaction Blocked',
          message: `Insufficient approved stock. Physical approved: ${currentMat.approvedPhysicalQty} ${currentMat.uom}.`,
          type: 'danger',
        });
        return false;
      }
      if (type === 'Reservation' && Math.abs(qty) > currentUsableAvailable) {
        addToast({
          title: 'Transaction Blocked',
          message: `Cannot reserve ${qty} ${currentMat.uom}. Available unreserved usable stock is ${currentUsableAvailable} ${currentMat.uom}.`,
          type: 'danger',
        });
        return false;
      }
      if (type === 'Adjustment' && currentMat.approvedPhysicalQty + qty < currentMat.reservedQty) {
        addToast({
          title: 'Transaction Blocked',
          message: `Adjustment would drop physical approved stock below reserved quantity (${currentMat.reservedQty} ${currentMat.uom}).`,
          type: 'danger',
        });
        return false;
      }

      setState((prev) => {
        const mat = prev.materials.find((m) => m.id === materialId);
        if (!mat) return prev;

        let updatedMat = { ...mat, lastUpdated: nowStamp() };
        let txnStatus = 'Approved';

        if (type === 'Inward') {
          if (requireQc) {
            updatedMat.pendingInspectionQty += Math.abs(qty);
            txnStatus = 'Pending Inspection';
          } else {
            updatedMat.approvedPhysicalQty += Math.abs(qty);
            txnStatus = 'Approved';
          }
        } else if (type === 'Outward') {
          const issueQty = Math.abs(qty);
          updatedMat.approvedPhysicalQty = Math.max(0, updatedMat.approvedPhysicalQty - issueQty);
          updatedMat.reservedQty = Math.max(
            0,
            updatedMat.reservedQty - Math.min(updatedMat.reservedQty, issueQty)
          );
          txnStatus = 'Issued';
        } else if (type === 'Reservation') {
          updatedMat.reservedQty += Math.abs(qty);
          txnStatus = 'Reserved';
        } else if (type === 'Release Reservation') {
          const rel = Math.min(updatedMat.reservedQty, Math.abs(qty));
          updatedMat.reservedQty -= rel;
          txnStatus = 'Released';
        } else if (type === 'Adjustment') {
          updatedMat.approvedPhysicalQty = updatedMat.approvedPhysicalQty + qty;
          txnStatus = 'Adjusted';
        }

        const newTxn = {
          id: generateId('TXN', prev.materialTransactions),
          materialId,
          type,
          quantity: qty,
          status: txnStatus,
          reference: reference || `MANUAL-${todayDate()}`,
          remarks: remarks || `${type} recorded locally`,
          performedBy: `${currentUser.name} (${currentUser.role})`,
          timestamp: nowStamp(),
        };

        let nextQc = prev.qualityInspections;
        if (type === 'Inward' && requireQc) {
          nextQc = [
            {
              id: generateId('QC-2026', prev.qualityInspections),
              itemType: 'Raw Material',
              itemId: mat.id,
              itemName: mat.name,
              batchNumber: `RM-LOT-${Date.now().toString().slice(-5)}`,
              inspectionDate: todayDate(),
              inspectedQty: Math.abs(qty),
              acceptedQty: 0,
              rejectedQty: 0,
              uom: mat.uom,
              inspector: 'Pending Assignment',
              status: 'Pending',
              reference: reference || newTxn.id,
              notes: remarks || 'Auto-queued from Store inward entry.',
            },
            ...prev.qualityInspections,
          ];
        }

        return {
          ...prev,
          materials: prev.materials.map((m) => (m.id === materialId ? updatedMat : m)),
          materialTransactions: [newTxn, ...prev.materialTransactions],
          qualityInspections: nextQc,
        };
      });

      addToast({
        title: `Stock ${type} Recorded`,
        message: 'Inventory ledger updated locally.',
        type: 'success',
      });
      return true;
    },
    [state.materials, addToast, currentUser]
  );

  // --- Multi-Line GRN Receipt ---
  const recordGrnReceipt = useCallback(
    ({
      grnNumber,
      receiptDate,
      poId,
      poNumber,
      supplierId,
      supplierInvoice,
      deliveryChallan,
      vehicleNumber,
      receivedBy,
      remarks,
      items = [],
    }) => {
      if (!items || items.length === 0) return false;

      setState((prev) => {
        let updatedMaterials = [...prev.materials];
        let newTransactions = [];
        let newQcInspections = [];

        items.forEach((item, index) => {
          const matIndex = updatedMaterials.findIndex((m) => m.id === item.materialId);
          if (matIndex === -1) return;
          const mat = updatedMaterials[matIndex];
          const netQty = Number(item.netReceivedQty || item.receivedQty || 0);
          const damagedQty = Number(item.damagedQty || 0);
          const requireQc = item.requireQc !== false;

          let updatedMat = { ...mat, lastUpdated: nowStamp() };
          let txnStatus = 'Approved';

          if (requireQc) {
            updatedMat.pendingInspectionQty = (updatedMat.pendingInspectionQty || 0) + netQty;
            if (damagedQty > 0) {
              updatedMat.rejectedQty = (updatedMat.rejectedQty || 0) + damagedQty;
            }
            txnStatus = 'Pending Inspection';
          } else {
            updatedMat.approvedPhysicalQty = (updatedMat.approvedPhysicalQty || 0) + netQty;
            if (damagedQty > 0) {
              updatedMat.rejectedQty = (updatedMat.rejectedQty || 0) + damagedQty;
            }
            txnStatus = 'Approved';
          }

          if (item.location) {
            updatedMat.location = item.location;
          }

          updatedMaterials[matIndex] = updatedMat;

          const txnId = `TXN-${String(prev.materialTransactions.length + newTransactions.length + 1).padStart(3, '0')}`;
          newTransactions.push({
            id: txnId,
            materialId: item.materialId,
            type: 'Inward',
            quantity: netQty,
            status: txnStatus,
            reference: `${grnNumber} / ${poNumber || deliveryChallan || supplierInvoice || 'Direct'}`,
            remarks: [
              remarks ? `Notes: ${remarks}` : '',
              item.batchNumber ? `Heat/Batch: ${item.batchNumber}` : '',
              item.location ? `Loc: ${item.location}` : '',
              damagedQty > 0 ? `Damaged: ${damagedQty} ${item.uom}` : '',
              supplierInvoice ? `Inv: ${supplierInvoice}` : '',
              vehicleNumber ? `Vehicle: ${vehicleNumber}` : '',
            ]
              .filter(Boolean)
              .join(' · ') || 'GRN Inward receipt.',
            performedBy: receivedBy || `${currentUser.name} (${currentUser.role})`,
            timestamp: `${receiptDate || todayDate()} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
            grnNumber,
            batchNumber: item.batchNumber,
            storageLocation: item.location,
            warehouse: item.warehouse,
          });

          if (requireQc) {
            const qcId = `QC-2026-${String(prev.qualityInspections.length + newQcInspections.length + 1).padStart(3, '0')}`;
            newQcInspections.push({
              id: qcId,
              itemType: 'Raw Material',
              itemId: mat.id,
              itemName: mat.name,
              batchNumber: item.batchNumber || `RM-LOT-${grnNumber}-${index + 1}`,
              inspectionDate: receiptDate || todayDate(),
              inspectedQty: netQty,
              acceptedQty: 0,
              rejectedQty: damagedQty,
              uom: mat.uom,
              inspector: 'Pending Assignment',
              status: 'Pending',
              reference: `${grnNumber} / ${poNumber || 'Direct'}`,
              notes: `GRN Inward. Invoice: ${supplierInvoice || '—'}. Challan: ${deliveryChallan || '—'}. Location: ${item.location || '—'}`,
            });
          }
        });

        // Update PO if linked
        let updatedPurchaseOrders = prev.purchaseOrders;
        if (poId) {
          updatedPurchaseOrders = prev.purchaseOrders.map((po) => {
            if (po.id !== poId && po.poNumber !== poId) return po;
            const updatedItems = (po.items || []).map((pItem) => {
              const inwardLine = items.find((it) => it.materialId === pItem.materialId);
              if (!inwardLine) return pItem;
              const netQty = Number(inwardLine.netReceivedQty || inwardLine.receivedQty || 0);
              return {
                ...pItem,
                receivedQty: (pItem.receivedQty || 0) + netQty,
              };
            });
            const allReceived = updatedItems.every(
              (it) => (it.receivedQty || 0) >= (it.orderedQty || 0)
            );
            const someReceived = updatedItems.some((it) => (it.receivedQty || 0) > 0);
            const status = allReceived
              ? 'Received'
              : someReceived
              ? 'Partially Received'
              : po.status;

            const newRecHistory = items.map((it, idx) => ({
              id: `REC-${Date.now()}-${idx}`,
              grnNumber,
              receivedDate: `${receiptDate || todayDate()}`,
              materialId: it.materialId,
              receivedQty: Number(it.netReceivedQty || it.receivedQty || 0),
              qcStatus: it.requireQc !== false ? 'Pending Inspection' : 'Accepted',
              receivedBy: receivedBy || currentUser.name,
            }));

            return {
              ...po,
              status,
              items: updatedItems,
              receivingHistory: [...newRecHistory, ...(po.receivingHistory || [])],
            };
          });
        }

        return {
          ...prev,
          materials: updatedMaterials,
          materialTransactions: [...newTransactions, ...prev.materialTransactions],
          qualityInspections: [...newQcInspections, ...prev.qualityInspections],
          purchaseOrders: updatedPurchaseOrders,
        };
      });

      addToast({
        title: 'GRN Receipt Created',
        message: `${grnNumber} recorded with ${items.length} line item(s).`,
        type: 'success',
      });
      return true;
    },
    [addToast, currentUser]
  );

  // --- Single / Multi-Field Stock Outward Issue ---
  const recordStockOutward = useCallback(
    ({
      issueNumber,
      issueDateTime,
      issuedBy,
      receivedBy,
      warehouse,
      planId,
      planNumber,
      workOrderNumber,
      productId,
      productName,
      machineId,
      machineName,
      operation,
      department,
      materialId,
      batchNumber,
      storageLocation,
      quantity,
      woReservedQty = 0,
      remarks,
    }) => {
      const issueQty = Number(quantity);
      if (!materialId || Number.isNaN(issueQty) || issueQty <= 0) {
        addToast({
          title: 'Transaction Blocked',
          message: 'Please provide a valid material and positive issue quantity.',
          type: 'danger',
        });
        return false;
      }

      const currentMat = state.materials.find((m) => m.id === materialId);
      if (!currentMat) {
        addToast({
          title: 'Transaction Blocked',
          message: 'Selected raw material does not exist in inventory records.',
          type: 'danger',
        });
        return false;
      }

      const netAvailableStock = Math.max(
        0,
        Number(currentMat.approvedPhysicalQty || 0) - Number(currentMat.reservedQty || 0)
      );
      const eligibleStock = netAvailableStock + Number(woReservedQty || 0);

      if (issueQty > eligibleStock) {
        addToast({
          title: 'Transaction Blocked',
          message: `Cannot issue ${issueQty} ${currentMat.uom}. Maximum eligible stock is ${eligibleStock} ${currentMat.uom} (${netAvailableStock} unreserved + ${woReservedQty} WO reservation).`,
          type: 'danger',
        });
        return false;
      }

      setState((prev) => {
        const matIndex = prev.materials.findIndex((m) => m.id === materialId);
        if (matIndex === -1) return prev;
        const mat = prev.materials[matIndex];

        let updatedMat = { ...mat, lastUpdated: nowStamp() };
        // Deduct physical approved stock
        updatedMat.approvedPhysicalQty = Math.max(0, updatedMat.approvedPhysicalQty - issueQty);

        // Deduct from reserved quantity only what was actually reserved for this Work Order
        if (woReservedQty > 0) {
          const consumedReservation = Math.min(issueQty, Number(woReservedQty));
          updatedMat.reservedQty = Math.max(0, updatedMat.reservedQty - consumedReservation);
        }

        const newTxnId = `TXN-${String(prev.materialTransactions.length + 1).padStart(3, '0')}`;
        const newTxn = {
          id: newTxnId,
          materialId,
          type: 'Outward',
          quantity: -Math.abs(issueQty),
          status: 'Issued',
          reference: `${issueNumber || 'ISSUE'} / ${workOrderNumber || planNumber || planId || 'Direct'}`,
          remarks: [
            remarks || '',
            workOrderNumber ? `WO: ${workOrderNumber}` : planId ? `Plan: ${planId}` : '',
            productName ? `Product: ${productName}` : '',
            machineName ? `Machine: ${machineName}` : '',
            operation ? `Op: ${operation}` : '',
            department ? `Dept: ${department}` : '',
            batchNumber ? `Batch/Heat: ${batchNumber}` : '',
            storageLocation ? `Location: ${storageLocation}` : '',
            warehouse ? `Warehouse: ${warehouse}` : '',
            receivedBy ? `Receiver: ${receivedBy}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'Raw material issued to production.',
          performedBy: issuedBy || `${currentUser.name} (${currentUser.role})`,
          receivedBy: receivedBy || '',
          timestamp: issueDateTime || nowStamp(),
          issueNumber: issueNumber || newTxnId,
          planId: planId || '',
          workOrderNumber: workOrderNumber || '',
          batchNumber: batchNumber || '',
          warehouse: warehouse || '',
          storageLocation: storageLocation || '',
        };

        const updatedMaterials = [...prev.materials];
        updatedMaterials[matIndex] = updatedMat;

        let updatedReservations = prev.stockReservations || initialStockReservations;
        if (workOrderNumber || planId || planNumber) {
          let remainingToDeduct = issueQty;
          updatedReservations = updatedReservations.map((res) => {
            if (
              remainingToDeduct > 0 &&
              (res.status === 'Active' || res.status === 'Partially Consumed') &&
              res.materialId === materialId &&
              ((workOrderNumber && res.workOrderNumber === workOrderNumber) ||
                (planId && (res.planId === planId || res.productionPlanNumber === planId)) ||
                (planNumber && res.productionPlanNumber === planNumber))
            ) {
              const resRemaining = Math.max(0, res.reservedQuantity - (res.consumedQuantity || 0));
              const consumeFromThis = Math.min(remainingToDeduct, resRemaining);
              if (consumeFromThis > 0) {
                remainingToDeduct -= consumeFromThis;
                const newConsumed = (res.consumedQuantity || 0) + consumeFromThis;
                const newStatus = newConsumed >= res.reservedQuantity ? 'Released' : 'Partially Consumed';
                return {
                  ...res,
                  consumedQuantity: newConsumed,
                  remainingQuantity: Math.max(0, res.reservedQuantity - newConsumed),
                  status: newStatus,
                  lastUpdated: nowStamp(),
                  statusNote:
                    newStatus === 'Released'
                      ? `Fully consumed via Outward ${issueNumber || newTxnId}`
                      : `Partially consumed (${consumeFromThis} ${res.unit}) via Outward ${issueNumber || newTxnId}`,
                };
              }
            }
            return res;
          });
        }

        return {
          ...prev,
          materials: updatedMaterials,
          materialTransactions: [newTxn, ...prev.materialTransactions],
          stockReservations: updatedReservations,
        };
      });

      addToast({
        title: 'Material Issued (Stock Outward)',
        message: `${issueNumber || 'Outward'}: Issued ${issueQty} ${currentMat.uom} to ${workOrderNumber || planNumber || 'Production'}.`,
        type: 'success',
      });
      return true;
    },
    [state.materials, addToast, currentUser]
  );

  // --- Stock Reservations ---
  const createStockReservation = useCallback(
    (payload) => {
      const {
        reservationNumber,
        reservationDate,
        reservedBy,
        productionPlanNumber,
        planId,
        workOrderNumber,
        productName,
        machineNumber,
        requiredProductionQuantity,
        requiredByDate,
        materialId,
        materialCode,
        materialName,
        materialGrade,
        unit,
        warehouse,
        batchNumber,
        approvedUsableStock,
        existingReservedQuantity,
        netAvailableStock,
        requiredQuantity,
        previouslyReservedQuantity,
        previouslyIssuedQuantity,
        remainingRequirement,
        reservedQuantity,
        remainingAvailableStockAfterReservation,
        expiryDate,
        priority,
        remarks,
        storageLocation,
      } = payload;

      const resQty = Number(reservedQuantity) || 0;
      if (resQty <= 0) {
        addToast({
          title: 'Validation Error',
          message: 'Reservation quantity must be greater than zero.',
          type: 'error',
        });
        return false;
      }

      const currentMat = state.materials.find((m) => m.id === materialId);
      if (!currentMat) {
        addToast({
          title: 'Material Not Found',
          message: 'Selected material could not be found.',
          type: 'error',
        });
        return false;
      }

      setState((prev) => {
        const matIndex = prev.materials.findIndex((m) => m.id === materialId);
        if (matIndex === -1) return prev;

        const mat = prev.materials[matIndex];
        const updatedMat = {
          ...mat,
          reservedQty: (mat.reservedQty || 0) + resQty,
          lastUpdated: nowStamp(),
        };

        const newReservation = {
          id: reservationNumber || `RES-${Date.now()}`,
          reservationNumber: reservationNumber || `RES-${Date.now()}`,
          reservationDate: reservationDate || todayDate(),
          reservedBy: reservedBy || `${currentUser.name} (${currentUser.role})`,
          status: 'Active',
          productionPlanNumber: productionPlanNumber || planId || '',
          planId: planId || productionPlanNumber || '',
          workOrderNumber: workOrderNumber || '',
          productName: productName || '',
          machineNumber: machineNumber || '',
          requiredProductionQuantity: Number(requiredProductionQuantity) || 0,
          requiredByDate: requiredByDate || '',
          materialId,
          materialCode: materialCode || mat.code,
          materialName: materialName || mat.name,
          materialGrade: materialGrade || mat.grade || '',
          unit: unit || mat.uom || 'Kg',
          warehouse: warehouse || 'Central Warehouse',
          batchNumber: batchNumber || 'ALL-APPROVED',
          approvedUsableStock: Number(approvedUsableStock) || mat.approvedPhysicalQty || 0,
          existingReservedQuantity: Number(existingReservedQuantity) || mat.reservedQty || 0,
          netAvailableStock: Number(netAvailableStock) || 0,
          requiredQuantity: Number(requiredQuantity) || 0,
          previouslyReservedQuantity: Number(previouslyReservedQuantity) || 0,
          previouslyIssuedQuantity: Number(previouslyIssuedQuantity) || 0,
          remainingRequirement: Number(remainingRequirement) || 0,
          reservedQuantity: resQty,
          consumedQuantity: 0,
          remainingQuantity: resQty,
          remainingAvailableStockAfterReservation: Number(remainingAvailableStockAfterReservation) || 0,
          expiryDate: expiryDate || '',
          priority: priority || 'Normal',
          remarks: remarks || '',
          storageLocation: storageLocation || mat.storageLocation || '',
          createdAt: nowStamp(),
          lastUpdated: nowStamp(),
        };

        const newTxnId = `TXN-${String(prev.materialTransactions.length + 1).padStart(3, '0')}`;
        const newTxn = {
          id: newTxnId,
          materialId,
          type: 'Reservation',
          quantity: resQty,
          status: 'Reserved',
          reference: `${newReservation.reservationNumber} / ${workOrderNumber || productionPlanNumber || 'Plan'}`,
          remarks: `Stock reserved for ${productName || 'Production'} (Priority: ${priority || 'Normal'}). ${remarks || ''}`.trim(),
          performedBy: reservedBy || `${currentUser.name} (${currentUser.role})`,
          timestamp: nowStamp(),
          reservationNumber: newReservation.reservationNumber,
          workOrderNumber: workOrderNumber || '',
          batchNumber: batchNumber || '',
          warehouse: warehouse || '',
        };

        const updatedMaterials = [...prev.materials];
        updatedMaterials[matIndex] = updatedMat;

        return {
          ...prev,
          materials: updatedMaterials,
          materialTransactions: [newTxn, ...prev.materialTransactions],
          stockReservations: [newReservation, ...(prev.stockReservations || initialStockReservations)],
        };
      });

      addToast({
        title: 'Stock Reserved Successfully',
        message: `${reservationNumber}: Reserved ${resQty} ${currentMat.uom} of ${currentMat.name} for ${workOrderNumber || productionPlanNumber}.`,
        type: 'success',
      });
      return true;
    },
    [state.materials, addToast, currentUser]
  );

  const releaseStockReservation = useCallback(
    (reservationId, releaseReason = 'Plan changed or cancelled') => {
      const existingRes = (state.stockReservations || initialStockReservations).find(
        (r) => r.id === reservationId || r.reservationNumber === reservationId
      );

      if (!existingRes) {
        addToast({
          title: 'Reservation Not Found',
          message: 'Could not find the reservation to release.',
          type: 'error',
        });
        return false;
      }

      if (existingRes.status === 'Released' || existingRes.status === 'Expired') {
        addToast({
          title: 'Already Inactive',
          message: `Reservation is already marked as ${existingRes.status}.`,
          type: 'warning',
        });
        return false;
      }

      const unconsumed = Math.max(0, existingRes.reservedQuantity - (existingRes.consumedQuantity || 0));

      setState((prev) => {
        let updatedMaterials = prev.materials;
        let newTransactions = prev.materialTransactions;

        if (unconsumed > 0) {
          const matIndex = prev.materials.findIndex((m) => m.id === existingRes.materialId);
          if (matIndex !== -1) {
            const mat = prev.materials[matIndex];
            const updatedMat = {
              ...mat,
              reservedQty: Math.max(0, (mat.reservedQty || 0) - unconsumed),
              lastUpdated: nowStamp(),
            };
            updatedMaterials = [...prev.materials];
            updatedMaterials[matIndex] = updatedMat;

            const newTxnId = `TXN-${String(prev.materialTransactions.length + 1).padStart(3, '0')}`;
            const newTxn = {
              id: newTxnId,
              materialId: existingRes.materialId,
              type: 'Release',
              quantity: -unconsumed,
              status: 'Released',
              reference: `${existingRes.reservationNumber} / Released`,
              remarks: `Reservation released (${releaseReason}). Returned ${unconsumed} ${existingRes.unit} to available stock.`,
              performedBy: `${currentUser.name} (${currentUser.role})`,
              timestamp: nowStamp(),
              reservationNumber: existingRes.reservationNumber,
              workOrderNumber: existingRes.workOrderNumber || '',
            };
            newTransactions = [newTxn, ...prev.materialTransactions];
          }
        }

        const currentReservations = prev.stockReservations || initialStockReservations;
        const updatedReservations = currentReservations.map((r) => {
          if (r.id === reservationId || r.reservationNumber === reservationId) {
            return {
              ...r,
              status: 'Released',
              releaseDate: todayDate(),
              releasedBy: `${currentUser.name} (${currentUser.role})`,
              releaseReason: releaseReason.trim() || 'Manual release by store manager',
              remainingQuantity: 0,
              lastUpdated: nowStamp(),
              statusNote: `Released: ${releaseReason.trim() || 'Manual release'} (${unconsumed} ${r.unit} returned to pool)`,
            };
          }
          return r;
        });

        return {
          ...prev,
          materials: updatedMaterials,
          materialTransactions: newTransactions,
          stockReservations: updatedReservations,
        };
      });

      addToast({
        title: 'Reservation Released',
        message: `${existingRes.reservationNumber} released. ${unconsumed} ${existingRes.unit} returned to available inventory.`,
        type: 'success',
      });
      return true;
    },
    [state.stockReservations, state.materials, addToast, currentUser]
  );

  // --- Machines ---
  const saveMachine = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.machines.some((m) => m.id === payload.id);
        const machines = exists
          ? prev.machines.map((m) => (m.id === payload.id ? { ...m, ...payload } : m))
          : [{ ...payload, id: generateId('MCH', prev.machines) }, ...prev.machines];
        return { ...prev, machines };
      });
      addToast({ title: 'Machine Saved', message: `${payload.name} updated locally.` });
    },
    [addToast]
  );

  const deleteMachine = useCallback(
    (machineId) => {
      setState((prev) => {
        const target = prev.machines.find((m) => m.id === machineId);
        const name = target?.name || 'Machine';
        return {
          ...prev,
          machines: prev.machines.filter((m) => m.id !== machineId),
        };
      });
      addToast({
        title: 'Machine Deleted',
        message: 'Machine was removed from LocalStorage.',
        type: 'info',
      });
    },
    [addToast]
  );

  // --- Customer Schedules ---
  const addSchedulesBatch = useCallback(
    (validRows, importSummary) => {
      setState((prev) => {
        const newSchedules = validRows.map((r, idx) => ({
          id: `SCH-${Date.now()}-${idx}`,
          scheduleNumber: r.scheduleNumber,
          customerId: r.customerId,
          productId: r.productId,
          scheduledQty: Number(r.scheduledQty),
          deliveredQty: 0,
          pendingQty: Number(r.scheduledQty),
          requiredDate: r.requiredDate,
          priority: r.priority || 'Medium',
          status: 'Scheduled',
          revision: 'Rev 1',
          importedAt: nowStamp(),
        }));

        const importLog = {
          id: generateId('IMP', prev.scheduleImports),
          fileName: importSummary.fileName,
          uploadedBy: currentUser.name,
          uploadedAt: nowStamp(),
          totalRows: importSummary.totalRows,
          importedRows: validRows.length,
          errorRows: importSummary.errorRows,
          duplicateRows: importSummary.duplicateRows,
          status:
            importSummary.errorRows > 0 || importSummary.duplicateRows > 0
              ? 'Completed with Warnings'
              : 'Success',
        };

        return {
          ...prev,
          schedules: [...newSchedules, ...prev.schedules],
          scheduleImports: [importLog, ...prev.scheduleImports],
        };
      });
      addToast({
        title: 'Schedule Import Confirmed (Demo)',
        message: `${validRows.length} schedule rows added to LocalStorage.`,
      });
    },
    [addToast, currentUser]
  );

  const saveSchedule = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.schedules.some((s) => s.id === payload.id);
        let scheduleRevisions = prev.scheduleRevisions;
        const schedules = exists
          ? prev.schedules.map((s) => {
              if (s.id !== payload.id) return s;
              const nextRevNum = parseInt(String(s.revision || 'Rev 1').replace(/\D/g, ''), 10) + 1;
              const nextRev = `Rev ${nextRevNum}`;
              scheduleRevisions = [
                {
                  id: generateId('SREV', scheduleRevisions),
                  scheduleNumber: payload.scheduleNumber,
                  revision: nextRev,
                  changedBy: `${currentUser.name} (${currentUser.role})`,
                  changeDate: nowStamp(),
                  summary: payload.revisionNote || 'Updated schedule quantity or delivery date.',
                },
                ...scheduleRevisions,
              ];
              return {
                ...s,
                ...payload,
                pendingQty: Math.max(0, Number(payload.scheduledQty) - Number(s.deliveredQty || 0)),
                revision: nextRev,
              };
            })
          : [
              {
                ...payload,
                id: generateId('SCH', prev.schedules),
                deliveredQty: 0,
                pendingQty: Number(payload.scheduledQty),
                revision: 'Rev 1',
                importedAt: nowStamp(),
              },
              ...prev.schedules,
            ];
        return { ...prev, schedules, scheduleRevisions };
      });
      addToast({ title: 'Schedule Saved', message: `${payload.scheduleNumber} updated.` });
    },
    [addToast, currentUser]
  );

  const deleteSchedule = useCallback(
    (scheduleId) => {
      setState((prev) => {
        const target = prev.schedules.find((s) => s.id === scheduleId);
        const num = target?.scheduleNumber || 'Schedule';
        return {
          ...prev,
          schedules: prev.schedules.filter((s) => s.id !== scheduleId),
        };
      });
      addToast({
        title: 'Schedule Deleted',
        message: 'Customer schedule was removed from LocalStorage.',
        type: 'info',
      });
    },
    [addToast]
  );

  // --- Purchase Management ---
  const savePurchaseOrder = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.purchaseOrders.some((p) => p.id === payload.id);
        const totalAmount = (payload.items || []).reduce(
          (sum, item) => sum + Number(item.orderedQty || 0) * Number(item.unitPrice || 0),
          0
        );
        const purchaseOrders = exists
          ? prev.purchaseOrders.map((p) =>
              p.id === payload.id ? { ...p, ...payload, totalAmount } : p
            )
          : [
              {
                ...payload,
                id: generateId('PO', prev.purchaseOrders),
                poNumber: payload.poNumber || `PO-2026-0${prev.purchaseOrders.length + 47}`,
                totalAmount,
                receivingHistory: [],
              },
              ...prev.purchaseOrders,
            ];
        return { ...prev, purchaseOrders };
      });
      addToast({ title: 'Purchase Order Saved', message: 'PO details saved locally.' });
    },
    [addToast]
  );

  const updatePurchaseStatus = useCallback(
    (poId, status) => {
      setState((prev) => ({
        ...prev,
        purchaseOrders: prev.purchaseOrders.map((p) =>
          p.id === poId ? { ...p, status } : p
        ),
      }));
      addToast({ title: 'PO Status Updated', message: `Order marked as ${status}.` });
    },
    [addToast]
  );

  const receivePurchaseItems = useCallback(
    (poId, { materialId, receivedQty, grnNumber }) => {
      const qty = Number(receivedQty);
      if (!qty || qty <= 0) return;

      setState((prev) => {
        const mat = prev.materials.find((m) => m.id === materialId);
        const po = prev.purchaseOrders.find((p) => p.id === poId);
        if (!mat || !po) return prev;

        const grn = grnNumber || `GRN-${Math.floor(890 + Math.random() * 100)}`;
        const updatedItems = po.items.map((item) =>
          item.materialId === materialId
            ? { ...item, receivedQty: Math.min(item.orderedQty, item.receivedQty + qty) }
            : item
        );
        const allReceived = updatedItems.every((i) => i.receivedQty >= i.orderedQty);
        const nextStatus = allReceived ? 'Received' : 'Partially Received';

        const updatedPo = {
          ...po,
          status: nextStatus,
          items: updatedItems,
          receivingHistory: [
            {
              id: `REC-${Date.now()}`,
              grnNumber: grn,
              receivedDate: nowStamp(),
              materialId,
              receivedQty: qty,
              qcStatus: 'Pending Inspection',
              receivedBy: currentUser.name,
            },
            ...(po.receivingHistory || []),
          ],
        };

        // Add to material pendingInspectionQty (Business Rule: NOT usable until QC approves!)
        const updatedMaterials = prev.materials.map((m) =>
          m.id === materialId
            ? {
                ...m,
                pendingInspectionQty: m.pendingInspectionQty + qty,
                lastUpdated: nowStamp(),
              }
            : m
        );

        const newTxn = {
          id: generateId('TXN', prev.materialTransactions),
          materialId,
          type: 'Inward',
          quantity: qty,
          status: 'Pending Inspection',
          reference: `${po.poNumber} / ${grn}`,
          remarks: 'Goods received against PO — awaiting Quality Control inspection.',
          performedBy: `${currentUser.name} (${currentUser.role})`,
          timestamp: nowStamp(),
        };

        const newQc = {
          id: generateId('QC-2026', prev.qualityInspections),
          itemType: 'Raw Material',
          itemId: mat.id,
          itemName: mat.name,
          batchNumber: `RM-LOT-${grn}`,
          inspectionDate: todayDate(),
          inspectedQty: qty,
          acceptedQty: 0,
          rejectedQty: 0,
          uom: mat.uom,
          inspector: 'Pending Assignment',
          status: 'Pending',
          reference: `${grn} / ${po.poNumber}`,
          notes: `Received from PO ${po.poNumber}; held in pending inspection queue.`,
        };

        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((p) => (p.id === poId ? updatedPo : p)),
          materials: updatedMaterials,
          materialTransactions: [newTxn, ...prev.materialTransactions],
          qualityInspections: [newQc, ...prev.qualityInspections],
        };
      });

      addToast({
        title: 'Goods Received into QC Queue',
        message: 'Stock held under Pending Inspection until Quality approval.',
        type: 'info',
      });
    },
    [addToast, currentUser]
  );

  // --- Production Planning ---
  const saveProductionPlan = useCallback(
    (payload, revisionNote = 'Plan updated') => {
      setState((prev) => {
        const exists = prev.productionPlans.some((p) => p.id === payload.id);
        const productionPlans = exists
          ? prev.productionPlans.map((p) => {
              if (p.id !== payload.id) return p;
              const nextRev = (p.revision || 1) + 1;
              return {
                ...p,
                ...payload,
                revision: nextRev,
                revisions: [
                  {
                    version: nextRev,
                    date: nowStamp(),
                    changedBy: currentUser.name,
                    note: revisionNote,
                  },
                  ...(p.revisions || []),
                ],
              };
            })
          : [
              {
                ...payload,
                id: generateId('PLAN-2026', prev.productionPlans),
                revision: 1,
                revisions: [
                  {
                    version: 1,
                    date: nowStamp(),
                    changedBy: currentUser.name,
                    note: revisionNote || 'Initial production plan created.',
                  },
                ],
              },
              ...prev.productionPlans,
            ];

        return { ...prev, productionPlans };
      });
      addToast({
        title: payload.id ? 'Production Plan Revised' : 'Production Plan Created',
        message: 'Saved locally in demo workspace.',
      });
    },
    [addToast, currentUser]
  );

  // --- Production Execution ---
  const saveProductionEntry = useCallback(
    (payload) => {
      const actualQty = Number(payload.actualQty || 0);
      const rejectedQty = Number(payload.rejectedQty || 0);
      const goodOutput = Math.max(0, actualQty - rejectedQty);

      setState((prev) => {
        const exists = prev.productionEntries.some((e) => e.id === payload.id);
        const entryId = exists ? payload.id : generateId('PE-2026', prev.productionEntries);
        const entry = {
          ...payload,
          id: entryId,
          actualQty,
          rejectedQty,
          goodOutput,
        };

        const productionEntries = exists
          ? prev.productionEntries.map((e) => (e.id === payload.id ? entry : e))
          : [entry, ...prev.productionEntries];

        let qualityInspections = prev.qualityInspections;
        if (entry.status === 'Submitted' || entry.status === 'Verified') {
          const alreadyHasQc = prev.qualityInspections.some((q) =>
            String(q.reference).includes(entryId)
          );
          if (!alreadyHasQc) {
            const product = prev.products.find((p) => p.id === entry.productId);
            qualityInspections = [
              {
                id: generateId('QC-2026', prev.qualityInspections),
                itemType: 'Finished Goods',
                itemId: entry.productId,
                itemName: product?.name || entry.productId,
                batchNumber: `FG-BTH-${entryId.slice(-3)}`,
                inspectionDate: entry.productionDate || todayDate(),
                inspectedQty: actualQty,
                acceptedQty: 0,
                rejectedQty: 0,
                uom: product?.uom || 'Nos',
                inspector: 'Pending Assignment',
                status: 'Pending',
                reference: `${entryId} / ${entry.planId}`,
                notes: 'Auto-created from production execution log. Usable stock updates only upon QC acceptance.',
              },
              ...prev.qualityInspections,
            ];
          }
        }

        return { ...prev, productionEntries, qualityInspections };
      });

      addToast({
        title: 'Production Log Saved',
        message: `Recorded ${goodOutput} good output units locally.`,
      });
    },
    [addToast]
  );

  // --- Quality Control ---
  const processQualityInspection = useCallback(
    (qcId, { acceptedQty, rejectedQty, status, notes, inspector }) => {
      const acc = Number(acceptedQty || 0);
      const rej = Number(rejectedQty || 0);

      setState((prev) => {
        const qc = prev.qualityInspections.find((q) => q.id === qcId);
        if (!qc) return prev;

        const updatedQc = {
          ...qc,
          acceptedQty: acc,
          rejectedQty: rej,
          status,
          notes: notes ?? qc.notes,
          inspector: inspector || currentUser.name,
          inspectionDate: todayDate(),
        };

        let nextMaterials = prev.materials;
        let nextTxns = prev.materialTransactions;
        let nextFg = prev.finishedGoods;

        // Only update stock deltas if previously not yet finalized
        const wasFinalized = ['Accepted', 'Rejected', 'Partially Accepted'].includes(qc.status);
        if (!wasFinalized) {
          if (qc.itemType === 'Raw Material') {
            nextMaterials = prev.materials.map((m) => {
              if (m.id !== qc.itemId) return m;
              const processed = acc + rej;
              return {
                ...m,
                pendingInspectionQty: Math.max(0, m.pendingInspectionQty - processed),
                approvedPhysicalQty: m.approvedPhysicalQty + acc,
                rejectedQty: m.rejectedQty + rej,
                lastUpdated: nowStamp(),
              };
            });

            nextTxns = [
              {
                id: generateId('TXN', prev.materialTransactions),
                materialId: qc.itemId,
                type: 'QC Inspection',
                quantity: acc,
                status,
                reference: qc.id,
                remarks: `QC ${status}: ${acc} ${qc.uom} accepted to usable stock, ${rej} ${qc.uom} rejected.`,
                performedBy: `${inspector || currentUser.name} (Quality)`,
                timestamp: nowStamp(),
              },
              ...prev.materialTransactions,
            ];
          } else if (qc.itemType === 'Finished Goods') {
            const existingBatch = prev.finishedGoods.find(
              (fg) => fg.batchNumber === qc.batchNumber
            );
            if (existingBatch) {
              nextFg = prev.finishedGoods.map((fg) =>
                fg.batchNumber === qc.batchNumber
                  ? {
                      ...fg,
                      acceptedQty: fg.acceptedQty + acc,
                      rejectedQty: fg.rejectedQty + rej,
                      lastUpdated: nowStamp(),
                      history: [
                        { date: todayDate(), action: `QC ${status}`, qty: acc, ref: qc.id },
                        ...(fg.history || []),
                      ],
                    }
                  : fg
              );
            } else {
              nextFg = [
                {
                  id: generateId('FG', prev.finishedGoods),
                  productId: qc.itemId,
                  batchNumber: qc.batchNumber,
                  producedQty: qc.inspectedQty,
                  acceptedQty: acc,
                  rejectedQty: rej,
                  reservedQty: 0,
                  storageLocation: acc > 0 ? 'FG Zone A-02' : 'Quarantine Bay Q-1',
                  lastUpdated: nowStamp(),
                  history: [
                    { date: todayDate(), action: `QC ${status}`, qty: acc, ref: qc.id },
                  ],
                },
                ...prev.finishedGoods,
              ];
            }
          }
        }

        return {
          ...prev,
          qualityInspections: prev.qualityInspections.map((q) =>
            q.id === qcId ? updatedQc : q
          ),
          materials: nextMaterials,
          materialTransactions: nextTxns,
          finishedGoods: nextFg,
        };
      });

      addToast({
        title: `Inspection ${status}`,
        message: `${acc} accepted into usable inventory; ${rej} quarantined/rejected.`,
      });
    },
    [addToast, currentUser]
  );

  const createQualityInspection = useCallback(
    (payload) => {
      setState((prev) => ({
        ...prev,
        qualityInspections: [
          {
            ...payload,
            id: generateId('QC-2026', prev.qualityInspections),
            inspectionDate: todayDate(),
          },
          ...prev.qualityInspections,
        ],
      }));
      addToast({ title: 'Inspection Queued', message: 'Added to Quality Control queue.' });
    },
    [addToast]
  );

  // --- Sales Orders ---
  const saveSalesOrder = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.salesOrders.some((s) => s.id === payload.id);
        const salesOrders = exists
          ? prev.salesOrders.map((s) => (s.id === payload.id ? { ...s, ...payload } : s))
          : [
              {
                ...payload,
                id: generateId('SO', prev.salesOrders),
                soNumber: payload.soNumber || `SO-2026-${301 + prev.salesOrders.length}`,
                dispatchedQty: 0,
              },
              ...prev.salesOrders,
            ];
        return { ...prev, salesOrders };
      });
      addToast({ title: 'Sales Order Saved', message: 'Updated in local demo store.' });
    },
    [addToast]
  );

  // --- Dispatch ---
  const createDispatchRecord = useCallback(
    (payload) => {
      const qty = Number(payload.dispatchQty || 0);
      setState((prev) => {
        const newDispatch = {
          ...payload,
          id: generateId('DSP', prev.dispatches),
          dispatchNumber: `DSP-2026-0${85 + prev.dispatches.length}`,
          dispatchQty: qty,
        };

        const salesOrders = prev.salesOrders.map((so) => {
          if (so.id !== payload.salesOrderId) return so;
          const nextDisp = (so.dispatchedQty || 0) + qty;
          return {
            ...so,
            dispatchedQty: nextDisp,
            status: nextDisp >= so.quantity ? 'Dispatched' : so.status,
          };
        });

        return {
          ...prev,
          dispatches: [newDispatch, ...prev.dispatches],
          salesOrders,
        };
      });
      addToast({ title: 'Dispatch Record Created', message: 'Shipment logged locally.' });
    },
    [addToast]
  );

  const updateDispatchStatus = useCallback(
    (dispatchId, deliveryStatus) => {
      setState((prev) => ({
        ...prev,
        dispatches: prev.dispatches.map((d) =>
          d.id === dispatchId ? { ...d, deliveryStatus } : d
        ),
      }));
      addToast({ title: 'Delivery Status Updated', message: `Marked as ${deliveryStatus}.` });
    },
    [addToast]
  );

  // --- Billing ---
  const createBillingDocument = useCallback(
    (payload) => {
      setState((prev) => ({
        ...prev,
        billingDocuments: [
          {
            ...payload,
            id: generateId('BIL', prev.billingDocuments),
            documentNumber: `DOC-2026-${1101 + prev.billingDocuments.length}`,
          },
          ...prev.billingDocuments,
        ],
      }));
      addToast({ title: 'Billing Proof Created', message: 'Document added locally.' });
    },
    [addToast]
  );

  const recordBillingPayment = useCallback(
    (billId, paymentAmount) => {
      const pay = Number(paymentAmount || 0);
      setState((prev) => ({
        ...prev,
        billingDocuments: prev.billingDocuments.map((b) => {
          if (b.id !== billId) return b;
          const nextPaid = Math.min(b.amount, (b.paidAmount || 0) + pay);
          return {
            ...b,
            paidAmount: nextPaid,
            status: nextPaid >= b.amount ? 'Settled' : 'Partially Paid',
          };
        }),
      }));
      addToast({ title: 'Payment Recorded', message: 'Settlement balance updated locally.' });
    },
    [addToast]
  );

  // --- Finance ---
  const saveFinanceTransaction = useCallback(
    (payload) => {
      setState((prev) => ({
        ...prev,
        financeTransactions: [
          {
            ...payload,
            id: generateId('FIN', prev.financeTransactions),
            amount: Number(payload.amount || 0),
          },
          ...prev.financeTransactions,
        ],
      }));
      addToast({ title: 'Financial Record Added', message: 'Saved in local ledger.' });
    },
    [addToast]
  );

  // --- Notifications ---
  const markNotificationRead = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    addToast({ title: 'Notifications Cleared', message: 'All alerts marked as read.' });
  }, [addToast]);

  // --- Users & Settings ---
  const saveUser = useCallback(
    (payload) => {
      setState((prev) => {
        const exists = prev.users.some((u) => u.id === payload.id);
        const users = exists
          ? prev.users.map((u) => (u.id === payload.id ? { ...u, ...payload } : u))
          : [
              {
                ...payload,
                id: generateId('USR', prev.users),
                lastActive: nowStamp(),
              },
              ...prev.users,
            ];
        return { ...prev, users };
      });
      addToast({ title: 'User Saved (Demo)', message: `${payload.name} updated.` });
    },
    [addToast]
  );

  const updateSettings = useCallback(
    (updates) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...updates },
      }));
      addToast({ title: 'Settings Saved', message: 'System preferences persisted locally.' });
    },
    [addToast]
  );

  const resetAllDemoData = useCallback(() => {
    const fresh = storageService.resetToSeed();
    setState(fresh);
    addToast({
      title: 'Demo Data Reset',
      message: 'All ERP records restored to initial manufacturing seed state.',
      type: 'info',
    });
  }, [addToast]);

  return (
    <ErpDataContext.Provider
      value={{
        ...state,
        saveCustomer,
        toggleCustomerStatus,
        deleteCustomer,
        importCustomersBatch,
        saveProduct,
        toggleProductStatus,
        deleteProduct,
        saveBom,
        deleteBom,
        saveSupplier,
        deleteSupplier,
        saveMaterial,
        deleteMaterial,
        recordMaterialTransaction,
        recordGrnReceipt,
        recordStockOutward,
        stockReservations: state.stockReservations || initialStockReservations,
        createStockReservation,
        releaseStockReservation,
        saveMachine,
        deleteMachine,
        addSchedulesBatch,
        saveSchedule,
        deleteSchedule,
        savePurchaseOrder,
        updatePurchaseStatus,
        receivePurchaseItems,
        saveProductionPlan,
        saveProductionEntry,
        processQualityInspection,
        createQualityInspection,
        saveSalesOrder,
        createDispatchRecord,
        updateDispatchStatus,
        createBillingDocument,
        recordBillingPayment,
        saveFinanceTransaction,
        markNotificationRead,
        markAllNotificationsRead,
        saveUser,
        updateSettings,
        resetAllDemoData,
      }}
    >
      {children}
    </ErpDataContext.Provider>
  );
}

export function useErpData() {
  const ctx = useContext(ErpDataContext);
  if (!ctx) throw new Error('useErpData must be used inside ErpDataProvider');
  return ctx;
}
