sap.ui.define([
    "store/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/library",
    "sap/ui/model/Sorter"
],
function (Controller, JSONModel, MessageBox, Filter, Fragment, FilterOperator,coreLibrary,Sorter) {
    "use strict";
    
    var SortOrder = coreLibrary.SortOrder;

    return Controller.extend("store.controller.Page", {
        onInit: function () {
            this.getRouter().getRoute("Page").attachMatched(this._onRouteMatched, this);
            var oProductModel = new JSONModel({
                ProductCollection: []
            });
            this.getView().setModel(oProductModel, "productModel");
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this.Uuid = oArgs.Uuid;
            this.storeCode = oArgs.storeCode;
            this.storeName = oArgs.storeName;

            // 데이터를 가져오는 함수 호출
            this._getData();
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");

            //Uuid값이 있는 상세페이지
            if (this.Uuid) {
                var sPath = "/Head(guid'" + this.Uuid + "')";
                var iPath = "/Head(guid'" + this.Uuid + "')/to_Item";

                this.detailbtn();
                this.headbtn();

                oMainModel.read(sPath, {
                    success: function (oData) {
                        var oStoreModel = new JSONModel(oData);
                        this.getView().setModel(oStoreModel, "storeModel");
                    }.bind(this),
                    error: function () {
                        MessageBox.error("데이터를 불러올 수 없습니다.");
                    }
                });

                oMainModel.read(iPath, {
                    success: function (oData2) {
                        var oItemModel = new JSONModel(oData2.results);

                        // StoreCode를 기준으로 오름차순 정렬
                        oItemModel.setProperty("/results", oData2.results.sort(function (a, b) {
                            return a.ProductCode.localeCompare(b.ProductCode);
                        }));

                        this.getView().setModel(oItemModel, "itemModel");
                    }.bind(this),
                    error: function () {
                        MessageBox.error("데이터를 불러올 수 없습니다.");
                    }
                });

                // 편의점코드 및 편의점명을 select 컴포넌트에 바인딩
                this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                    var storecodes = aGetData.filter(function (codedata) {
                        return codedata.StoreStatus === 'Y';
                    }).map(function (codedata) {
                        return {
                            StoreCode: codedata.StoreCode,
                            StoreName: codedata.StoreName
                        };
                    });

                    var oCodeModel = new JSONModel({ storecodes: storecodes });
                    this.getView().setModel(oCodeModel, "codeModel");

                    var oStoreModel = this.getView().getModel("storeModel");
                    if (oStoreModel) {
                        var oStoreData = oStoreModel.getData();
                        var selectStoreKey = aGetData.find(function (item) {
                            return item.StoreCode === oStoreData.StoreCode;
                        });
                        if (selectStoreKey) {
                            var oSelect = this.getView().byId("selectcvname");
                            oSelect.setSelectedKey(selectStoreKey.StoreCode);
                        }
                    }
                }.bind(this)).catch(function () {
                    MessageBox.error("브랜드명을 불러올 수 없습니다.");
                });

            //Uuid가 없는 생성페이지
            } else if (this.storeCode && this.storeName) {
                this.createbtn();
                this.clearSelectedProducts();
                this.headbtn2();

                // 편의점코드 및 편의점명을 select 컴포넌트에 바인딩
                this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                    var storecodes = aGetData.filter(function (codedata) {
                        return codedata.StoreStatus === 'Y';
                    }).map(function (codedata) {
                        return {
                            StoreCode: codedata.StoreCode,
                            StoreName: codedata.StoreName
                        };
                    });

                    var oCodeModel = new JSONModel({ storecodes: storecodes });
                    this.getView().setModel(oCodeModel, "codeModel");

                    var oStoreModel = this.getView().getModel("storeModel");
                    if (oStoreModel) {
                        var oStoreData = oStoreModel.getData();
                        var selectStoreKey = aGetData.find(function (item) {
                            return item.StoreCode === oStoreData.StoreCode;
                        });
                        if (selectStoreKey) {
                            var oSelect = this.getView().byId("selectcvname");
                            oSelect.setSelectedKey(selectStoreKey.StoreCode);
                        }
                    }

                }.bind(this)).catch(function () {
                    MessageBox.error("브랜드명을 불러올 수 없습니다.");
                });

                // storeCode와 storeName을 사용하여 필요한 작업 수행
                // 예를 들어, 특정 데이터를 찾고 모델에 바인딩하는 로직 추가
                this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                    var oStoreData = aGetData.find(function (item) {
                        return item.StoreCode === this.storeCode && item.StoreName === this.storeName;
                    }.bind(this));

                    if (oStoreData) {
                        var oStoreModel = new JSONModel(oStoreData);
                        this.getView().setModel(oStoreModel, "storeModel");

                        // Select 컨트롤에 선택된 값을 설정하는 예시
                        var oSelect = this.getView().byId("selectcvname");
                        if (oSelect) {
                            oSelect.setSelectedKey(oStoreData.StoreCode);
                        }
                    } else {
                        MessageBox.error("해당 StoreCode와 StoreName을 찾을 수 없습니다.");
                    }
                }.bind(this)).catch(function () {
                    MessageBox.error("데이터를 불러올 수 없습니다.");
                });
            }
        },

       // 생성 시 저장 버튼
onSave: function() {
    var oMainModel = this.getOwnerComponent().getModel();
    var headData = this.getModel("storeModel").getData();
    var selectData = this.getModel("selectModel").getData();
    console.log("Header Data:", headData);
    console.log("Select Data:", selectData);

    // 헤더 데이터 저장
    oMainModel.create("/Head", {
        StoreCode: headData.StoreCode,
        StoreName: headData.StoreName,
        StoreBrname: headData.StoreBrname,
        StoreRegion: headData.StoreRegion,
        StorePhone: headData.StorePhone
    }, {
        success: function(headers) {
            var headUuid = headers.Uuid;
            console.log("Head UUID:", headUuid);

            // 각 아이템 데이터 저장
            selectData.items.forEach(function(item) {
                var newItemData = {
                    ProductCode: item.ProductCode,
                    ProductCategory: item.ProductCategory,
                    ProductName: item.ProductName,
                    ProductCompany: item.ProductCompany,
                    ProductWeight: item.ProductWeight,
                    ProductPrice: item.ProductPrice,
                    ProductStock: item.ProductStock,
                    UnitKg: item.UnitKg,
                    UnitPrice: item.UnitPrice,
                    Parentsuuid: headUuid
                };

                // 각 아이템의 URI 생성
                var newUri = "/Head(Uuid=guid'" + headUuid + "')/to_Item";
                console.log("Creating item with URI:", newUri, "Data:", newItemData);

                // 각 아이템 개별 저장
                oMainModel.create(newUri, newItemData, {
                    success: function(itemResponse) {
                        console.log("Item saved successfully", itemResponse);
                    },
                    error: function(err) {
                        console.error("Failed to save item", err);
                        MessageBox.information("아이템 데이터를 저장하지 못했습니다.");
                    }
                });
            });

            // 저장이 완료되면 메인 페이지로 이동합니다.
            this.getOwnerComponent().getRouter().navTo("Main", {});
        }.bind(this),
        error: function(err) {
            console.error("Failed to save header", err);
            MessageBox.information("헤더 데이터를 저장하지 못했습니다.");
        }
    });
},
        //주문 버튼
        onOrder: function () {
            this._openDialog();
        },

        //제품 선택 다이얼로그 (주문)
        _openDialog: function () {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment("store.view.Fragments.Dialog", this);
                this.getView().addDependent(this._oDialog);
            }

            var oProductModel = this.getOwnerComponent().getModel("pmanageData");
            this._getODataRead(oProductModel, "/Pmanage").done(
                function (aGetData) {
                    var oProductData = {
                        ProductCollection: aGetData
                    };
                    this.getView().setModel(new JSONModel(oProductData), "productModel");
                    this._oDialog.open();  // 데이터 설정 후 다이얼로그 열기
                
                }.bind(this)).fail(function () {
                    MessageBox.information("상품 조회를 할 수 없습니다.");
                });
        },

        //다이얼로그 데이터 검색 버튼 (제품명)
        handleSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("ProductName", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        //다이얼로그 select 버튼
        handleConfirm: function (oEvent) {
            var aSelectedContexts = oEvent.getParameter("selectedContexts");
            if (aSelectedContexts.length) {
                var oselectModel = this.getView().getModel("selectModel");
                if (!oselectModel) {
                    oselectModel = new JSONModel();
                    this.getView().setModel(oselectModel, "selectModel");
                }
        
                var aSelectedProducts = aSelectedContexts.map(function (oContext) {
                    var oProduct = oContext.getObject();
                    //oProduct.ProductStock = 30; 
                    return oProduct;
                });
                
                 // ProductCode를 기준으로 오름차순 정렬
                 aSelectedProducts.sort(function (a, b) {
                    return a.ProductCode.localeCompare(b.ProductCode);
                });
                
                oselectModel.setProperty("/items", aSelectedProducts);
        
                console.log("선택한 상품", aSelectedProducts);
            }       
            
            this._oDialog._oDialog.close();  // 다이얼로그 닫기
        },

        // 다이얼로그 cancel 버튼
        handleClose: function () {
                this._oDialog._oDialog.close();  
        },

        //선택한 상품 초기화
        clearSelectedProducts: function() {
            var oSelectModel = this.getView().getModel("selectModel");
            if (oSelectModel) {
                oSelectModel.setData({ items: [] }); 
            }
        },
        
        //뒤로가기 버튼
        onBack : function(){
            this.clearSelectedProducts();
            this.navTo("Main",{});
        },
        
        // 판매 버튼
        onSell: function () {
            var oTable = this.byId("productsTable");
            var aSelectedIndices = oTable.getSelectedIndices();
            var oItemModel = this.getModel("itemModel");
            var oMainModel = this.getOwnerComponent().getModel();

            if (aSelectedIndices.length === 0) {
                MessageBox.information("선택된 상품이 없습니다.");
                return;
            }

            var oItemData = oItemModel.getData();
            var aPromises = [];

            aSelectedIndices.forEach(function (index) {
                var oRowData = oItemData[index];

                // 재고를 1 감소하고 UI 업데이트
                if (oRowData.ProductStock > 0) {
                    oRowData.ProductStock -= 1;

                    // UI에서 판매 버튼 비활성화
                    if (oRowData.ProductStock === 0) {
                        var oButton = this.getView().byId("sellbtn");
                        oButton.setEnabled(false);
                    }

                    // Item 엔티티 업데이트
                    var oUpdatePromise = this.updateItem(oMainModel, oRowData.Uuid, oRowData.Parentsuuid, oRowData.ProductStock);
                    aPromises.push(oUpdatePromise);
                }
            }, this);

            oTable.clearSelection();

            // 모든 Promise가 완료될 때까지 기다린 후 메시지 출력
            Promise.all(aPromises).then(function () {
                MessageBox.success("선택된 상품들이 판매되었습니다.");

                // 모든 데이터 업데이트 후, UI 모델 다시 설정
                oItemModel.setData(oItemData);

                // 재고 상태에 따라 아이콘 색상 업데이트
                this.StockIcons(oItemData);

                }.bind(this)).catch(function (error) {
                MessageBox.error("재고 상태 아이콘에 오류가 발생했습니다.");

            }).catch(function (error) {
                MessageBox.error("상품 판매 중 오류가 발생했습니다.");
                console.error("상품 업데이트 오류", error);
            });
        },

        // 재고 추가
        onStock: function () {
            var oTable = this.byId("productsTable");
            var aSelectedIndices = oTable.getSelectedIndices();
            var oItemModel = this.getModel("itemModel");
            var oMainModel = this.getOwnerComponent().getModel();
        
            if (aSelectedIndices.length === 0) {
                MessageBox.information("선택된 상품이 없습니다.");
                return;
            }
        
            var oItemData = oItemModel.getData();
            var aPromises = [];
        
            aSelectedIndices.forEach(function (index) {
                var oRowData = oItemData[index];
        
                // 재고를 30으로 설정하고 UI 업데이트
                oRowData.ProductStock = 30;
        
                // Item 엔티티 업데이트
                var oUpdatePromise = this.updateItem(oMainModel, oRowData.Uuid, oRowData.Parentsuuid, oRowData.ProductStock);
                aPromises.push(oUpdatePromise);
            }, this);
        
            oTable.clearSelection();
            // 모든 Promise가 완료될 때까지 기다린 후 메시지 출력
            Promise.all(aPromises).then(function () {
                MessageBox.success("선택된 상품들의 재고가 추가되었습니다.");
        
                // 모든 데이터 업데이트 후, UI 모델 다시 설정
                oItemModel.setData(oItemData);

                // 재고 상태에 따라 아이콘 색상 업데이트
                this.StockIcons(oItemData);
                
                }.bind(this)).catch(function (error) {
                    MessageBox.error("재고 상태 아이콘에 오류가 발생했습니다.");
           
                }).catch(function (error) {
                MessageBox.error("재고 추가 중 오류가 발생했습니다.");
                console.error("재고 업데이트 오류", error);
            });
        },

        formatProductStock: function(value) {
            if (value === null || value === undefined) {
                return "grey"; // 기본 색상
            }
            // 재고 상태에 따른 색상 반환 예시
            if (value >= 20 && value <= 30) {
                return "green";
            } else if (value >= 10 && value < 20) {
                return "yellow";
            } else {
                return "red";
            }
        },        

        //데이터 업데이트
        updateItem: function (oModel, itemUuid, parentsUuid, productStock) {
            // 엔티티셋 경로와 키 값이 정확한지 확인
            var sItemPath = "/Item(Uuid=guid'" + itemUuid + "',Parentsuuid=guid'" + parentsUuid + "')";
            
            // 로그를 추가하여 경로를 확인
            console.log("Update Path: ", sItemPath);
            
            return new Promise(function (resolve, reject) {
                oModel.update(sItemPath, {
                    ProductStock: productStock
                }, {
                    method: "PATCH", // 부분 업데이트를 위해 PATCH 메서드 사용
                    success: function () {
                        resolve();
                    },
                    error: function (err) {
                        reject(err);
                    }
                });
            });
        },

        //무게 소수점 밑 0 제거
        formatNumber: function(value) {
            if (value !== null && value !== undefined) {
                return parseFloat(value.toString()).toString();
            }
            return value;
        },
        //상세페이지 들어갈때 
        detailbtn : function() {
            this.byId("stocknow").setVisible(true);
            this.byId("itemorder").setVisible(false);
            this.byId("savebtn").setVisible(false);
            this.byId("orderbtn").setVisible(false);
            this.byId("addbtn").setVisible(true);
            this.byId("sellbtn").setVisible(true);
        },

        //생성페이지 들어갈때
        createbtn : function() {
            this.byId("stocknow").setVisible(false);
            this.byId("itemorder").setVisible(true);
            this.byId("savebtn").setVisible(true);
            this.byId("orderbtn").setVisible(true);
            this.byId("addbtn").setVisible(false);
            this.byId("sellbtn").setVisible(false);
        },

        //head 데이터 비활성화
        headbtn : function() {
            this.byId("selectcvname").setEditable(false);
            this.byId("location").setEditable(false);
            this.byId("region").setEditable(false);
            this.byId("phone").setEditable(false);
        },

        //head 데이터 활성화
        headbtn2 : function() {
            this.byId("selectcvname").setEditable(true);
            this.byId("location").setEditable(true);
            this.byId("region").setEditable(true);
            this.byId("phone").setEditable(true);
        }
    });
});
