/// An error that was thrown by RxDB.
/// The [code] matches the error codes of the JavaScript RxDB,
/// see https://rxdb.info/errors.html
class RxError implements Exception {
  final String? code;
  final String message;
  final String? name;
  final dynamic parameters;
  final String? jsStack;

  RxError({this.code, required this.message, this.name, this.parameters, this.jsStack});

  factory RxError.fromJson(dynamic json) {
    final map = Map<String, dynamic>.from(json as Map);
    return RxError(
      code: map['code'] as String?,
      message: (map['message'] ?? '') as String,
      name: map['name'] as String?,
      parameters: map['parameters'],
      jsStack: map['stack'] as String?,
    );
  }

  /// True when a write failed because the document was changed in the meantime.
  bool get isConflict =>
      code == 'CONFLICT' ||
      (parameters is Map &&
          (parameters as Map)['writeError'] is Map &&
          ((parameters as Map)['writeError'] as Map)['status'] == 409);

  @override
  String toString() => 'RxError(${code ?? name ?? 'Error'}): $message';
}

Map<String, dynamic> errorToJson(Object err, [StackTrace? stack]) {
  if (err is RxError) {
    return {'message': err.message, 'code': err.code, 'name': err.name, 'parameters': err.parameters};
  }
  return {'name': err.runtimeType.toString(), 'message': err.toString(), 'stack': stack?.toString()};
}
