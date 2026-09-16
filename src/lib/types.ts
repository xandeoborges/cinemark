export interface TaskChangeRow {
  ClientDisplayName: string | null;
  ClientID: string | null;
  DateCalendar: string | null;
  FunctionGroupID: string | null;
  FunctionGroupName: string | null;
  GroupID: string | null;
  GroupName: string | null;
  JobID: string | null;
  JobNumber: string | null;
  Jobtitle: string | null;
  Month: number | null;
  ParentTaskID: string | null;
  ParentTaskNumber: string | null;
  ParentTaskTitle: string | null;
  PipelineStepID: string | null;
  PipelineStepName: string | null;
  ProductID: string | null;
  ProductName: string | null;
  RequestFirstDueDate: string | null;
  RequestTypeClassificationID: string | null;
  RequestTypeClassificationName: string | null;
  RequestTypeID: string | null;
  RequestTypeName: string | null;
  SpentHours: number | null;
  TaskClosingDate: string | null;
  TaskCreationDate: string | null;
  TaskID: string | null;
  TaskNumber: string | null;
  TaskTags: string | null;
  TaskTitle: string | null;
  UserFunctionID: string | null;
  UserFunctionTitle: string | null;
  UserID: string | null;
  UserLogin: string | null;
  RowID: number;
}

export interface DeliveryRow {
  ClientDisplayName: string | null;
  CreationDate: string | null;
  EffortUnitGroupName: string | null;
  EffortUnitGroupTypeName: string | null;
  JobTitle: string | null;
  Quantity: number | null;
  RequestTypeName: string | null;
  TaskNumber: number | null;
  TaskTitle: string | null;
  UnitName: string | null;
  RequestDeliveryID: number;
}
